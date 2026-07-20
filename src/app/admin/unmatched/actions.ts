"use server";

import { revalidatePath } from "next/cache";
import { ensureMovie } from "@/lib/matcher";
import { getDb } from "@/lib/supabase";
import { getMovieById, searchMovie, TmdbMovie } from "@/lib/tmdb";

/** Plain data-returning search, safe to call from a client component inline in the list. */
export async function searchTmdbForVideo(query: string, year?: number): Promise<TmdbMovie[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  let results = await searchMovie(trimmed, year);
  if (results.length === 0 && year) results = await searchMovie(trimmed);
  return results;
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
  const { error } = await db
    .from("videos")
    .update({ movie_id: movieDbId, match_status: "manual" })
    .eq("id", videoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/unmatched");
  return { ok: true };
}

export async function ignoreVideoInline(videoId: string): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const { error } = await db.from("videos").update({ match_status: "ignored" }).eq("id", videoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/unmatched");
  return { ok: true };
}
