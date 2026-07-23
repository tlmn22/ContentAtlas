"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/supabase";

/** Sends a wrongly-matched video (movie or TV show) back to the unmatched queue. */
export async function unlinkVideo(videoId: string): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const { error } = await db
    .from("videos")
    .update({ movie_id: null, tv_show_id: null, match_status: "unmatched", matched_by: null })
    .eq("id", videoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/movies");
  revalidatePath("/admin/tv-shows");
  revalidatePath("/admin/unmatched");
  revalidatePath("/admin");
  return { ok: true };
}

/** Deletes a movie entirely (e.g. a bogus TMDB match) and frees its videos back to unmatched. */
export async function deleteMovie(movieId: number): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();

  const { error: videoErr } = await db
    .from("videos")
    .update({ movie_id: null, match_status: "unmatched", matched_by: null })
    .eq("movie_id", movieId);
  if (videoErr) return { ok: false, error: videoErr.message };

  const { error: movieErr } = await db.from("movies").delete().eq("id", movieId);
  if (movieErr) return { ok: false, error: movieErr.message };

  revalidatePath("/admin/movies");
  revalidatePath("/admin/unmatched");
  revalidatePath("/admin");
  revalidatePath("/kino");
  revalidatePath("/");
  return { ok: true };
}

/** Same as deleteMovie but for TV shows. */
export async function deleteTvShow(tvShowId: number): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();

  const { error: videoErr } = await db
    .from("videos")
    .update({ tv_show_id: null, match_status: "unmatched", matched_by: null })
    .eq("tv_show_id", tvShowId);
  if (videoErr) return { ok: false, error: videoErr.message };

  const { error: showErr } = await db.from("tv_shows").delete().eq("id", tvShowId);
  if (showErr) return { ok: false, error: showErr.message };

  revalidatePath("/admin/tv-shows");
  revalidatePath("/admin/unmatched");
  revalidatePath("/admin");
  revalidatePath("/tv");
  revalidatePath("/");
  return { ok: true };
}
