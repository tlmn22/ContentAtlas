import { SupabaseClient } from "@supabase/supabase-js";
import { ensureMovie, findMovieForTitle } from "./matcher";
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

  await db.from("channels").update({ last_checked_at: new Date().toISOString() }).eq("id", channel.id);
  return result;
}

/**
 * Re-check every currently-available video of a channel against the API.
 * Deleted / private / non-embeddable videos are marked unavailable;
 * view counts of live ones are refreshed. Costs 1 quota unit per 50 videos.
 */
async function sweepAvailability(db: SupabaseClient, channelId: string): Promise<number> {
  const { data: live, error } = await db
    .from("videos")
    .select("id")
    .eq("channel_id", channelId)
    .eq("is_available", true);
  if (error) throw error;
  if (!live || live.length === 0) return 0;

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
