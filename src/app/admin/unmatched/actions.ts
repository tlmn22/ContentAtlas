"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/admin-auth";
import { ensureMovie, ensureTvShow } from "@/lib/matcher";
import { getDb } from "@/lib/supabase";
import { getMovieById, getTvShowById, searchMovie, searchTvShow, TmdbMovie, TmdbTvShow } from "@/lib/tmdb";

/** Plain data-returning search, safe to call from a client component inline in the list. */
export async function searchTmdbForVideo(query: string, year?: number): Promise<TmdbMovie[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  let results = await searchMovie(trimmed, year);
  if (results.length === 0 && year) results = await searchMovie(trimmed);
  return results;
}

/** Same as searchTmdbForVideo but against TMDB's TV database. */
export async function searchTmdbTvForVideo(query: string, year?: number): Promise<TmdbTvShow[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  let results = await searchTvShow(trimmed, year);
  if (results.length === 0 && year) results = await searchTvShow(trimmed);
  return results;
}

async function currentAdminUsername(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  return session?.username ?? null;
}

export async function linkVideoInline(
  videoId: string,
  tmdbId: number,
  titleMn: string | null
): Promise<{ ok: boolean; error?: string }> {
  const movie = await getMovieById(tmdbId);
  if (!movie) return { ok: false, error: "TMDB кино олдсонгүй" };

  const db = getDb();
  const movieDbId = await ensureMovie(db, movie, titleMn);
  const matchedBy = await currentAdminUsername();
  const { error } = await db
    .from("videos")
    .update({ movie_id: movieDbId, tv_show_id: null, match_status: "manual", matched_by: matchedBy })
    .eq("id", videoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/unmatched");
  revalidatePath("/admin/movies");
  revalidatePath("/admin");
  return { ok: true };
}

/** Same as linkVideoInline but for TV shows. */
export async function linkVideoToTvShowInline(
  videoId: string,
  tmdbId: number,
  titleMn: string | null
): Promise<{ ok: boolean; error?: string }> {
  const show = await getTvShowById(tmdbId);
  if (!show) return { ok: false, error: "TMDB цуврал олдсонгүй" };

  const db = getDb();
  const showDbId = await ensureTvShow(db, show, titleMn);
  const matchedBy = await currentAdminUsername();
  const { error } = await db
    .from("videos")
    .update({ tv_show_id: showDbId, movie_id: null, match_status: "manual", matched_by: matchedBy })
    .eq("id", videoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/unmatched");
  revalidatePath("/admin/movies");
  revalidatePath("/admin");
  return { ok: true };
}

export async function ignoreVideoInline(videoId: string): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const { error } = await db.from("videos").update({ match_status: "ignored" }).eq("id", videoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/unmatched");
  return { ok: true };
}

/**
 * Hard-deletes a video row. Unlike ignoreVideoInline, this doesn't leave a
 * record behind - if the video is still live on YouTube, the next
 * `npm run ingest` will re-add it and re-attempt auto-matching.
 */
export async function deleteVideoInline(videoId: string): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const { error } = await db.from("videos").delete().eq("id", videoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/unmatched");
  revalidatePath("/admin");
  return { ok: true };
}
