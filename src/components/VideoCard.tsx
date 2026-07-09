import Image from "next/image";
import Link from "next/link";
import { formatDuration, formatViews } from "@/lib/format";
import { MovieCardData } from "@/lib/queries";
import { Video } from "@/lib/types";

/**
 * Video thumbnail card. Matched videos link to their movie page with the
 * video preselected; unmatched ones open on YouTube.
 */
export default function VideoCard({
  video,
  movie,
  channelTitle,
}: {
  video: Video;
  movie: MovieCardData | null;
  channelTitle?: string;
}) {
  const href = movie
    ? `/kino/${movie.slug}?v=${video.id}`
    : `https://www.youtube.com/watch?v=${video.id}`;
  const external = !movie;

  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group block"
    >
      <div className="relative aspect-video overflow-hidden rounded-lg bg-surface ring-1 ring-white/5 transition group-hover:ring-accent/60">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : null}
        {video.duration_seconds ? (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium">
            {formatDuration(video.duration_seconds)}
          </span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug group-hover:text-accent">
        {video.title}
      </p>
      <p className="text-xs text-muted">
        {channelTitle ? `${channelTitle} · ` : ""}
        {formatViews(video.view_count)}
      </p>
    </Link>
  );
}
