import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Records one play of a movie's embedded video on our own site. */
export async function POST(req: NextRequest) {
  let body: { movieId?: unknown; videoId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const movieId = Number(body.movieId);
  if (!Number.isInteger(movieId) || movieId <= 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const videoId = typeof body.videoId === "string" ? body.videoId : null;

  const db = getDb();
  const { error } = await db.from("movie_plays").insert({ movie_id: movieId, video_id: videoId });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  return NextResponse.json({ ok: true });
}
