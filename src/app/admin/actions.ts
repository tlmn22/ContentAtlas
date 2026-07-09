"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureMovie } from "@/lib/matcher";
import { getDb } from "@/lib/supabase";
import { getMovieById } from "@/lib/tmdb";
import { getChannelInfo } from "@/lib/youtube";

export async function addChannel(formData: FormData) {
  const input = String(formData.get("channel") ?? "").trim();
  if (!input) redirect("/admin?error=" + encodeURIComponent("Сувгийн хаяг оруулна уу"));

  let info;
  try {
    info = await getChannelInfo(input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "YouTube API алдаа";
    redirect("/admin?error=" + encodeURIComponent(msg.slice(0, 200)));
  }
  if (!info) redirect("/admin?error=" + encodeURIComponent(`Суваг олдсонгүй: ${input}`));

  const db = getDb();
  const { error } = await db.from("channels").upsert(
    {
      id: info.id,
      title: info.title,
      handle: info.handle,
      avatar_url: info.avatarUrl,
      uploads_playlist_id: info.uploadsPlaylistId,
      is_active: true,
    },
    { onConflict: "id" }
  );
  if (error) redirect("/admin?error=" + encodeURIComponent(error.message));

  revalidatePath("/admin");
  redirect("/admin?ok=" + encodeURIComponent(`«${info.title}» нэмэгдлээ`));
}

export async function toggleChannel(id: string, isActive: boolean) {
  const db = getDb();
  await db.from("channels").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/admin");
}

export async function deleteChannel(id: string) {
  const db = getDb();
  await db.from("channels").delete().eq("id", id);
  revalidatePath("/admin");
}

/** Manually link an unmatched video to a TMDB movie. */
export async function linkVideo(videoId: string, tmdbId: number, titleMn: string | null) {
  const movie = await getMovieById(tmdbId);
  if (!movie) redirect("/admin/unmatched?error=" + encodeURIComponent("TMDB кино олдсонгүй"));

  const db = getDb();
  const movieDbId = await ensureMovie(db, movie, titleMn);
  await db
    .from("videos")
    .update({ movie_id: movieDbId, match_status: "manual" })
    .eq("id", videoId);

  revalidatePath("/admin/unmatched");
  redirect("/admin/unmatched?ok=" + encodeURIComponent("Холбогдлоо"));
}

/** Hide a video from the matching queue (trailers, vlogs, non-movie content). */
export async function ignoreVideo(videoId: string) {
  const db = getDb();
  await db.from("videos").update({ match_status: "ignored" }).eq("id", videoId);
  revalidatePath("/admin/unmatched");
  redirect("/admin/unmatched");
}
