import Image from "next/image";
import Link from "next/link";
import { MovieCardData } from "@/lib/queries";
import { posterUrl } from "@/lib/tmdb";

export default function MovieCard({
  movie,
  hrefPrefix = "/kino",
}: {
  movie: MovieCardData;
  hrefPrefix?: string;
}) {
  const poster = posterUrl(movie.poster_path);
  const displayTitle = movie.title_mn ?? movie.title;

  return (
    <Link
      href={`${hrefPrefix}/${movie.slug}`}
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
        {movie.channels.length > 0 && (
          <div className="absolute right-1.5 top-1.5 flex -space-x-2">
            {movie.channels.slice(0, 3).map((c) => (
              <span
                key={c.id}
                title={c.title}
                className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full ring-2 ring-black/70"
              >
                {c.avatar_url ? (
                  <Image src={c.avatar_url} alt={c.title} fill sizes="24px" className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-surface text-[10px] text-muted">
                    {c.title.slice(0, 1)}
                  </span>
                )}
              </span>
            ))}
            {movie.channels.length > 3 && (
              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/80 text-[10px] font-semibold text-muted ring-2 ring-black/70">
                +{movie.channels.length - 3}
              </span>
            )}
          </div>
        )}
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
