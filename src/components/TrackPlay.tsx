"use client";

import { useEffect, useRef } from "react";

/**
 * Fire-and-forget play tracker. Renders nothing; logs one play per
 * movie/video pair change so the admin can see what's actually watched
 * on-site, separate from YouTube's own view_count.
 */
export default function TrackPlay({ movieId, videoId }: { movieId: number; videoId: string }) {
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (lastTracked.current === videoId) return;
    lastTracked.current = videoId;

    fetch("/api/track-play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId, videoId }),
      keepalive: true,
    }).catch(() => {});
  }, [movieId, videoId]);

  return null;
}
