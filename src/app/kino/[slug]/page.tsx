import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, formatDuration, formatViews } from "@/lib/format";
import { getMovieBySlug } from "@/lib/queries";
import { posterUrl } from "@/lib/tmdb";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getMovieBySlug(slug).catch(() => null);
  if (!movie) return { title: "Кино олдсонгүй" };

  const name = movie.title_mn ?? movie.title;
  const title = `${name}${movie.year ? ` (${movie.year})` : ""} — кино тайлбар`;
  const description =
    movie.overview_mn ??
    movie.overview?.slice(0, 160) ??
    `${name} киноны тайлбар бичлэгүүдийг үзээрэй.`;
  const poster = posterUrl(movie.poster_path, "w500");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: poster ? [{ url: poster, width: 500, height: 750 }] : undefined,
    },
  };
}

export default async function MoviePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { v } = await searchParams;

  const movie = await getMovieBySlug(slug);
  if (!movie) notFound();

  const genres = movie.movie_genres.map((mg) => mg.genres).filter(Boolean);
  const activeVideo = movie.videos.find((video) => video.id === v) ?? movie.videos[0];
  const name = movie.title_mn ?? movie.title;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name,
    alternateName: movie.title_mn ? movie.title : undefined,
    datePublished: movie.year ? `${movie.year}` : undefined,
    image: posterUrl(movie.poster_path, "w500") ?? undefined,
    description: movie.overview_mn ?? movie.overview ?? undefined,
  };

  return (
    <div className="mt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="flex flex-col gap-8 md:flex-row">
        <div className="mx-auto w-48 shrink-0 md:mx-0 md:w-56">
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface ring-1 ring-white/10">
            {posterUrl(movie.poster_path, "w500") ? (
              <Image
                src={posterUrl(movie.poster_path, "w500")!}
                alt={name}
                fill
                sizes="224px"
                priority
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center text-muted">
                {name}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{name}</h1>
          {movie.title_mn && <p className="mt-1 text-lg text-muted">{movie.title}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {movie.year && <span className="text-muted">{movie.year}</span>}
            {movie.vote_average ? (
              <span className="font-semibold text-accent">★ {Number(movie.vote_average).toFixed(1)}</span>
            ) : null}
            {genres.map((g) => (
              <Link
                key={g.id}
                href={`/hailt?genre=${g.id}`}
                className="rounded-full bg-surface px-3 py-1 text-xs text-muted ring-1 ring-white/10 transition hover:text-accent"
              >
                {g.name_mn}
              </Link>
            ))}
          </div>

          {(movie.overview_mn ?? movie.overview) && (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
              {movie.overview_mn ?? movie.overview}
            </p>
          )}
        </div>
      </div>

      {activeVideo ? (
        <div className="mt-10">
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
            <iframe
              key={activeVideo.id}
              src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}`}
              title={activeVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="font-medium text-foreground">{activeVideo.title}</span>
            <Link href={`/suvag/${activeVideo.channels.id}`} className="transition hover:text-accent">
              {activeVideo.channels.title}
            </Link>
            <span>{formatViews(activeVideo.view_count)}</span>
            <span>{formatDate(activeVideo.published_at)}</span>
          </div>
        </div>
      ) : (
        <p className="mt-10 text-muted">Энэ кинонд одоогоор тайлбар бичлэг алга.</p>
      )}

      {movie.videos.length > 1 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-bold">Бүх тайлбар бичлэгүүд ({movie.videos.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {movie.videos.map((video) => {
              const active = video.id === activeVideo?.id;
              return (
                <Link
                  key={video.id}
                  href={`/kino/${movie.slug}?v=${video.id}`}
                  className={`flex gap-3 rounded-lg p-2 ring-1 transition ${
                    active
                      ? "bg-surface ring-accent/60"
                      : "ring-white/5 hover:bg-surface hover:ring-white/10"
                  }`}
                >
                  <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded bg-surface">
                    {video.thumbnail_url && (
                      <Image
                        src={video.thumbnail_url}
                        alt={video.title}
                        fill
                        sizes="144px"
                        className="object-cover"
                      />
                    )}
                    {video.duration_seconds ? (
                      <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px]">
                        {formatDuration(video.duration_seconds)}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-medium leading-snug">{video.title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {video.channels.title} · {formatViews(video.view_count)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
