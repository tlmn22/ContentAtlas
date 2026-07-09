import Image from "next/image";
import Link from "next/link";
import { MovieCardData } from "@/lib/queries";
import { posterUrl } from "@/lib/tmdb";

export default function MovieCard({ movie }: { movie: MovieCardData }) {
  const poster = posterUrl(movie.poster_path);
  const displayTitle = movie.title_mn ?? movie.title;

  return (
    <Link
      href={`/kino/${movie.slug}`}
      className="group block w-36 shrink-0 sm:w-44"
      title={displayTitle}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface ring-1 ring-white/5 transition group-hover:ring-accent/60">
        {poster ? (
          <Image
            src={poster}
            alt={displayTitle}
            fill
            sizes="(max-width: 640px) 144px, 176px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center text-sm text-muted">
            {displayTitle}
          </div>
        )}
        {movie.vote_average ? (
          <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-accent">
            ★ {Number(movie.vote_average).toFixed(1)}
          </span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug group-hover:text-accent">
        {displayTitle}
      </p>
      <p className="text-xs text-muted">
        {movie.title_mn ? `${movie.title} · ` : ""}
        {movie.year ?? ""}
      </p>
    </Link>
  );
}
