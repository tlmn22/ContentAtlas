"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatDate, formatViews } from "@/lib/format";
import { firstAirYear, posterUrl, releaseYear } from "@/lib/tmdb";
import { MovieCardData, TvShowCardData } from "@/lib/queries";
import { Video } from "@/lib/types";
import {
  ignoreVideoInline,
  linkVideoInline,
  linkVideoToTvShowInline,
  searchTmdbForVideo,
  searchTmdbTvForVideo,
} from "@/app/admin/unmatched/actions";

type ContentType = "movie" | "tv";

interface SearchResultItem {
  id: number;
  title: string;
  originalTitle: string;
  year: number | null;
  poster_path: string | null;
  vote_average: number;
}

export default function ChannelVideoRow({
  video,
  movie,
  tvShow,
  initialQuery,
  initialYear,
  initialTitleMn,
}: {
  video: Video;
  movie: Omit<MovieCardData, "channels"> | null;
  tvShow: Omit<TvShowCardData, "channels"> | null;
  initialQuery: string;
  initialYear: number | null;
  initialTitleMn: string | null;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [contentType, setContentType] = useState<ContentType>("movie");
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runSearch(q: string, type: ContentType) {
    setActionError(null);
    startTransition(async () => {
      if (type === "movie") {
        const r = await searchTmdbForVideo(q, initialYear ?? undefined);
        setResults(
          r.map((m) => ({
            id: m.id,
            title: m.title,
            originalTitle: m.original_title,
            year: releaseYear(m),
            poster_path: m.poster_path,
            vote_average: m.vote_average,
          }))
        );
      } else {
        const r = await searchTmdbTvForVideo(q, initialYear ?? undefined);
        setResults(
          r.map((s) => ({
            id: s.id,
            title: s.name,
            originalTitle: s.original_name,
            year: firstAirYear(s),
            poster_path: s.poster_path,
            vote_average: s.vote_average,
          }))
        );
      }
      setSearched(true);
    });
  }

  function expand() {
    setExpanded(true);
    if (!searched) runSearch(query, contentType);
  }

  function switchType(type: ContentType) {
    if (type === contentType) return;
    setContentType(type);
    setSearched(false);
    setResults(null);
    runSearch(query, type);
  }

  function handleLink(tmdbId: number) {
    setActionError(null);
    startTransition(async () => {
      const res =
        contentType === "movie"
          ? await linkVideoInline(video.id, tmdbId, initialTitleMn)
          : await linkVideoToTvShowInline(video.id, tmdbId, initialTitleMn);
      if (!res.ok) setActionError(res.error ?? "Алдаа гарлаа");
      else router.refresh();
    });
  }

  function handleIgnore() {
    setActionError(null);
    startTransition(async () => {
      const res = await ignoreVideoInline(video.id);
      if (!res.ok) setActionError(res.error ?? "Алдаа гарлаа");
      else router.refresh();
    });
  }

  const linked = movie ?? tvShow;

  return (
    <div className="rounded-lg ring-1 ring-white/5">
      <div className="flex items-center gap-4 p-2">
        <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded bg-surface">
          {video.thumbnail_url && (
            <Image src={video.thumbnail_url} alt={video.title} fill sizes="128px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium">{video.title}</p>
          <p className="mt-1 text-xs text-muted">
            {formatViews(video.view_count)} · {formatDate(video.published_at)}
          </p>
          {movie ? (
            <p className="mt-1 text-xs">
              <Link href={`/kino/${movie.slug}`} target="_blank" className="text-accent hover:underline">
                Холбогдсон (кино): {movie.title_mn ?? movie.title} ({movie.year ?? "?"})
              </Link>
              {video.matched_by && <span className="text-muted"> · {video.matched_by}</span>}
            </p>
          ) : tvShow ? (
            <p className="mt-1 text-xs">
              <Link href={`/tv/${tvShow.slug}`} target="_blank" className="text-accent hover:underline">
                Холбогдсон (ТВ): {tvShow.title_mn ?? tvShow.title} ({tvShow.year ?? "?"})
              </Link>
              {video.matched_by && <span className="text-muted"> · {video.matched_by}</span>}
            </p>
          ) : (
            <span className="mt-1 inline-block text-xs text-muted">Холбогдоогүй</span>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href={`https://www.youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
          >
            YouTube ↗
          </a>
          <button
            onClick={() => (expanded ? setExpanded(false) : expand())}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black transition hover:brightness-110"
          >
            {expanded ? "Хаах" : linked ? "Дахин холбох" : "Холбох"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 p-3">
          {actionError && (
            <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{actionError}</p>
          )}

          <div className="flex gap-1 rounded-lg bg-surface p-1 text-xs">
            <button
              onClick={() => switchType("movie")}
              className={`rounded px-3 py-1 transition ${
                contentType === "movie" ? "bg-accent text-black" : "text-muted hover:text-foreground"
              }`}
            >
              Кино
            </button>
            <button
              onClick={() => switchType("tv")}
              className={`rounded px-3 py-1 transition ${
                contentType === "tv" ? "bg-accent text-black" : "text-muted hover:text-foreground"
              }`}
            >
              ТВ цуврал
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch(query, contentType)}
              placeholder="TMDB-ээс хайх (англи нэр дээр сайн ажиллана)"
              className="w-72 rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent/60"
            />
            <button
              onClick={() => runSearch(query, contentType)}
              disabled={isPending}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-muted transition hover:text-foreground disabled:opacity-50"
            >
              Хайх
            </button>
            <button
              onClick={handleIgnore}
              disabled={isPending}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-muted transition hover:text-foreground disabled:opacity-50"
            >
              Кино биш — нуух
            </button>
          </div>

          {isPending && <p className="mt-4 text-sm text-muted">Уншиж байна...</p>}

          {!isPending && searched && results?.length === 0 && (
            <p className="mt-4 text-sm text-muted">TMDB-ээс илэрц олдсонгүй. Өөр нэрээр хайж үзнэ үү.</p>
          )}

          {!isPending && results && results.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {results.slice(0, 8).map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg p-2 ring-1 ring-white/5">
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded bg-surface">
                    {posterUrl(m.poster_path) && (
                      <Image
                        src={posterUrl(m.poster_path)!}
                        alt={m.title}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {m.title}{" "}
                      <span className="font-normal text-muted">
                        {m.year ?? "?"} · ★ {m.vote_average?.toFixed(1) ?? "-"}
                      </span>
                    </p>
                    {m.originalTitle !== m.title && (
                      <p className="text-xs text-muted">{m.originalTitle}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleLink(m.id)}
                    disabled={isPending}
                    className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
                  >
                    Холбох
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
