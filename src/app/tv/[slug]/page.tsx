import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, formatDuration, formatViews } from "@/lib/format";
import { getTvShowBySlug } from "@/lib/queries";
import { posterUrl } from "@/lib/tmdb";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const show = await getTvShowBySlug(slug).catch(() => null);
  if (!show) return { title: "Цуврал олдсонгүй" };

  const name = show.title_mn ?? show.title;
  const title = `${name}${show.year ? ` (${show.year})` : ""} — цуврал тайлбар`;
  const description =
    show.overview_mn ??
    show.overview?.slice(0, 160) ??
    `${name} цувралын тайлбар бичлэгүүдийг үзээрэй.`;
  const poster = posterUrl(show.poster_path, "w500");

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

export default async function TvShowPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { v } = await searchParams;

  const show = await getTvShowBySlug(slug);
  if (!show) notFound();

  const genres = show.tv_show_genres.map((sg) => sg.genres).filter(Boolean);
  const activeVideo = show.videos.find((video) => video.id === v) ?? show.videos[0];
  const name = show.title_mn ?? show.title;
  // show.videos is already ordered by view_count desc, so the first item is the most-viewed.
  const [topVideo, ...otherVideos] = show.videos;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name,
    alternateName: show.title_mn ? show.title : undefined,
    datePublished: show.year ? `${show.year}` : undefined,
    image: posterUrl(show.poster_path, "w500") ?? undefined,
    description: show.overview_mn ?? show.overview ?? undefined,
    numberOfSeasons: show.number_of_seasons ?? undefined,
    numberOfEpisodes: show.number_of_episodes ?? undefined,
    aggregateRating:
      show.vote_average && show.vote_count
        ? {
            "@type": "AggregateRating",
            ratingValue: show.vote_average,
            ratingCount: show.vote_count,
            bestRating: 10,
          }
        : undefined,
  };

  return (
    <div className="mt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="flex flex-col gap-8 md:flex-row">
        <div className="mx-auto w-48 shrink-0 md:mx-0 md:w-56">
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface ring-1 ring-white/10">
            {posterUrl(show.poster_path, "w500") ? (
              <Image
                src={posterUrl(show.poster_path, "w500")!}
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
          {show.title_mn && <p className="mt-1 text-lg text-muted">{show.title}</p>}
          {show.tagline && <p className="mt-2 italic text-muted">&ldquo;{show.tagline}&rdquo;</p>}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {show.year && <span className="text-muted">{show.year}</span>}
            {show.number_of_seasons ? (
              <span className="text-muted">{show.number_of_seasons} улирал</span>
            ) : null}
            {show.number_of_episodes ? (
              <span className="text-muted">{show.number_of_episodes} анги</span>
            ) : null}
            {show.vote_average ? (
              <span className="font-semibold text-accent">
                ★ {Number(show.vote_average).toFixed(1)}
                {show.vote_count ? (
                  <span className="font-normal text-muted"> ({show.vote_count.toLocaleString("en-US")} санал)</span>
                ) : null}
              </span>
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

          {(show.overview_mn ?? show.overview) && (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
              {show.overview_mn ?? show.overview}
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
          <div className="mt-4">
            <h2 className="text-lg font-semibold leading-snug text-foreground">{activeVideo.title}</h2>
            <Link
              href={`/suvag/${activeVideo.channels.id}`}
              className="mt-2 flex items-center gap-2 text-sm text-muted transition hover:text-accent"
            >
              <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-surface">
                {activeVideo.channels.avatar_url && (
                  <Image
                    src={activeVideo.channels.avatar_url}
                    alt={activeVideo.channels.title}
                    fill
                    sizes="28px"
                    className="object-cover"
                  />
                )}
              </span>
              <span className="flex flex-wrap items-center gap-x-1.5">
                <span className="font-medium">{activeVideo.channels.title}</span>
                <span>· {formatViews(activeVideo.view_count)}</span>
                <span>· {formatDate(activeVideo.published_at)}</span>
              </span>
            </Link>
          </div>
        </div>
      ) : (
        <p className="mt-10 text-muted">Энэ цувралд одоогоор тайлбар бичлэг алга.</p>
      )}

      {show.videos.length > 1 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-bold">Бүх тайлбар бичлэгүүд ({show.videos.length})</h2>

          <Link
            href={`/tv/${show.slug}?v=${topVideo.id}`}
            className={`flex flex-col gap-3 rounded-lg p-3 ring-1 transition sm:flex-row ${
              topVideo.id === activeVideo?.id
                ? "bg-surface ring-accent/60"
                : "ring-white/5 hover:bg-surface hover:ring-white/10"
            }`}
          >
            <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded bg-surface sm:w-80">
              {topVideo.thumbnail_url && (
                <Image
                  src={topVideo.thumbnail_url}
                  alt={topVideo.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 320px"
                  className="object-cover"
                />
              )}
              {topVideo.duration_seconds ? (
                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs">
                  {formatDuration(topVideo.duration_seconds)}
                </span>
              ) : null}
              <span className="absolute left-1.5 top-1.5 rounded bg-accent px-2 py-0.5 text-xs font-semibold text-black">
                Хамгийн их үзэлттэй
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold leading-snug">{topVideo.title}</p>
              <p className="mt-1.5 text-sm text-muted">
                {topVideo.channels.title} · {formatViews(topVideo.view_count)} ·{" "}
                {formatDate(topVideo.published_at)}
              </p>
            </div>
          </Link>

          {otherVideos.length > 0 && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {otherVideos.map((video) => {
                const active = video.id === activeVideo?.id;
                return (
                  <Link
                    key={video.id}
                    href={`/tv/${show.slug}?v=${video.id}`}
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
                        {video.channels.title} · {formatViews(video.view_count)} ·{" "}
                        {formatDate(video.published_at)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
