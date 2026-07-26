import { SupabaseClient } from "@supabase/supabase-js";
import { ensureMovie, findMovieForTitle } from "./matcher";
import { getMovieById } from "./tmdb";
import { getVideoDetails, listUploads, YtPlaylistVideo } from "./youtube";
import { Channel } from "./types";

export interface ChannelSyncResult {
  channelId: string;
  channelTitle: string;
  newVideos: number;
  matched: number;
  markedUnavailable: number;
  error?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PAGE_SIZE = 1000;

/**
 * Supabase/PostgREST caps a single request at 1000 rows by default. Queries
 * that need every matching row (not just a bounded "top N" list) must page
 * through with .range() or they silently truncate once a channel or the
 * unmatched queue grows past that cap.
 */
async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await query(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

/**
 * Sync one channel: pull new uploads, enrich, auto-match to TMDB,
 * and sweep existing videos for deleted/hidden ones.
 */
export async function syncChannel(db: SupabaseClient, channel: Channel): Promise<ChannelSyncResult> {
  const result: ChannelSyncResult = {
    channelId: channel.id,
    channelTitle: channel.title,
    newVideos: 0,
    matched: 0,
    markedUnavailable: 0,
  };

  // First sync (last_checked_at is null) walks the whole uploads playlist;
  // incremental syncs stop at the first fully-known page.
  const fullSync = channel.last_checked_at === null;
  const newVideos: YtPlaylistVideo[] = [];
  let pageToken: string | undefined;

  while (true) {
    const page = await listUploads(channel.uploads_playlist_id, pageToken);
    if (page.videos.length === 0) break;

    const ids = page.videos.map((v) => v.videoId);
    const { data: known, error } = await db.from("videos").select("id").in("id", ids);
    if (error) throw error;
    const knownIds = new Set((known ?? []).map((r) => r.id));

    newVideos.push(...page.videos.filter((v) => !knownIds.has(v.videoId)));

    const pageFullyKnown = knownIds.size === ids.length;
    if ((!fullSync && pageFullyKnown) || !page.nextPageToken) break;
    pageToken = page.nextPageToken;
  }

  if (newVideos.length > 0) {
    const details = await getVideoDetails(newVideos.map((v) => v.videoId));
    const rows = newVideos.map((v) => {
      const d = details.get(v.videoId);
      return {
        id: v.videoId,
        channel_id: channel.id,
        title: v.title,
        thumbnail_url: v.thumbnailUrl,
        published_at: v.publishedAt,
        duration_seconds: d?.durationSeconds ?? null,
        view_count: d?.viewCount ?? null,
        is_available: d ? d.isPublic && d.isEmbeddable : false,
      };
    });
    const { error } = await db.from("videos").upsert(rows, { onConflict: "id" });
    if (error) throw error;
    result.newVideos = rows.length;

    // Auto-match new videos against TMDB
    for (const v of newVideos) {
      try {
        const match = await findMovieForTitle(v.title);
        if (match) {
          const movieId = await ensureMovie(db, match.movie, match.titleMn);
          await db
            .from("videos")
            .update({ movie_id: movieId, match_status: "auto" })
            .eq("id", v.videoId);
          result.matched++;
        }
      } catch (err) {
        console.error(`Match failed for ${v.videoId} "${v.title}":`, err);
      }
      await sleep(100); // be polite to TMDB
    }
  }

  result.markedUnavailable = await sweepAvailability(db, channel.id);

  await db
    .from("channels")
    .update({ last_checked_at: new Date().toISOString(), last_sync_new_videos: result.newVideos })
    .eq("id", channel.id);
  return result;
}

/**
 * Re-check every currently-available video of a channel against the API.
 * Deleted / private / non-embeddable videos are marked unavailable;
 * view counts of live ones are refreshed. Costs 1 quota unit per 50 videos.
 */
async function sweepAvailability(db: SupabaseClient, channelId: string): Promise<number> {
  const live = await fetchAllRows<{ id: string }>((from, to) =>
    db
      .from("videos")
      .select("id")
      .eq("channel_id", channelId)
      .eq("is_available", true)
      .range(from, to)
  );
  if (live.length === 0) return 0;

  const details = await getVideoDetails(live.map((r) => r.id));
  let marked = 0;

  for (const { id } of live) {
    const d = details.get(id);
    if (!d || !d.isPublic || !d.isEmbeddable) {
      await db.from("videos").update({ is_available: false }).eq("id", id);
      marked++;
    } else if (d.viewCount !== null) {
      await db.from("videos").update({ view_count: d.viewCount }).eq("id", id);
    }
  }
  return marked;
}

/** Sync all active channels. Returns per-channel summaries. */
export async function ingestAll(db: SupabaseClient): Promise<ChannelSyncResult[]> {
  const { data: channels, error } = await db
    .from("channels")
    .select("*")
    .eq("is_active", true)
    .order("last_checked_at", { ascending: true, nullsFirst: true });
  if (error) throw error;

  const results: ChannelSyncResult[] = [];
  for (const channel of (channels ?? []) as Channel[]) {
    try {
      results.push(await syncChannel(db, channel));
    } catch (err) {
      results.push({
        channelId: channel.id,
        channelTitle: channel.title,
        newVideos: 0,
        matched: 0,
        markedUnavailable: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}

/**
 * Retry TMDB matching for videos still stuck as "unmatched" - useful after
 * fixing TMDB_API_TOKEN or improving the matcher, since a normal sync only
 * ever attempts matching once, on first ingest.
 */
export async function rematchUnmatched(db: SupabaseClient): Promise<{ matched: number; total: number }> {
  const videos = await fetchAllRows<{ id: string; title: string }>((from, to) =>
    db
      .from("videos")
      .select("id, title")
      .eq("match_status", "unmatched")
      .eq("is_available", true)
      .range(from, to)
  );

  let matched = 0;
  for (const v of videos) {
    try {
      const match = await findMovieForTitle(v.title);
      if (match) {
        const movieId = await ensureMovie(db, match.movie, match.titleMn);
        await db.from("videos").update({ movie_id: movieId, match_status: "auto" }).eq("id", v.id);
        matched++;
      }
    } catch (err) {
      console.error(`Rematch failed for ${v.id} "${v.title}":`, err);
    }
    await sleep(100);
  }
  return { matched, total: videos.length };
}

/**
 * Backfills runtime/imdb_id/budget/revenue/vote_count/tagline for movies
 * inserted before those columns existed (or via the auto-match path before
 * ensureMovie started fetching full TMDB details). Safe to re-run - only
 * targets rows where runtime is still null.
 */
export async function backfillMovieDetails(
  db: SupabaseClient
): Promise<{ updated: number; total: number }> {
  const movies = await fetchAllRows<{ id: number; tmdb_id: number; title: string }>((from, to) =>
    db.from("movies").select("id, tmdb_id, title").is("runtime", null).range(from, to)
  );

  let updated = 0;
  for (const m of movies) {
    try {
      const details = await getMovieById(m.tmdb_id);
      if (details) {
        const { error } = await db
          .from("movies")
          .update({
            vote_count: details.vote_count ?? null,
            runtime: details.runtime ?? null,
            imdb_id: details.imdb_id ?? null,
            budget: details.budget || null,
            revenue: details.revenue || null,
            tagline: details.tagline || null,
          })
          .eq("id", m.id);
        if (error) throw error;
        updated++;
      }
    } catch (err) {
      console.error(`Backfill failed for movie ${m.id} "${m.title}":`, err);
    }
    await sleep(100);
  }
  return { updated, total: movies.length };
}
