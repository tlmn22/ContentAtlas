"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatViews } from "@/lib/format";
import { AdminMovieVideo } from "@/lib/queries";
import { posterUrl, releaseYear, type TmdbMovie } from "@/lib/tmdb";
import { linkVideoInline, searchTmdbForVideo } from "@/app/admin/unmatched/actions";
import { unlinkVideo } from "@/app/admin/movies/actions";

export default function AdminMovieVideoLine({ video }: { video: AdminMovieVideo }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState(video.title);
  const [results, setResults] = useState<TmdbMovie[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runSearch(q: string) {
    setActionError(null);
    startTransition(async () => {
      const r = await searchTmdbForVideo(q);
      setResults(r);
      setSearched(true);
    });
  }

  function expand() {
    setExpanded(true);
    if (!searched) runSearch(query);
  }

  function handleRelink(tmdbId: number) {
    setActionError(null);
    startTransition(async () => {
      const res = await linkVideoInline(video.id, tmdbId, null);
      if (!res.ok) setActionError(res.error ?? "Алдаа гарлаа");
      else router.refresh();
    });
  }

  function handleUnlink() {
    setActionError(null);
    startTransition(async () => {
      const res = await unlinkVideo(video.id);
      if (!res.ok) setActionError(res.error ?? "Алдаа гарлаа");
      else router.refresh();
    });
  }

  return (
    <div className="rounded-lg ring-1 ring-white/5">
      <div className="flex items-center gap-3 p-2">
        <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded bg-surface">
          {video.thumbnail_url && (
            <Image src={video.thumbnail_url} alt={video.title} fill sizes="80px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-xs font-medium">{video.title}</p>
          <p className="text-xs text-muted">
            {video.channel.title} · {formatViews(video.view_count)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <a
            href={`https://www.youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-white/10 px-2 py-1 text-xs text-muted transition hover:text-foreground"
          >
            YT
          </a>
          <button
            onClick={() => (expanded ? setExpanded(false) : expand())}
            disabled={isPending}
            className="rounded border border-white/10 px-2 py-1 text-xs text-muted transition hover:text-foreground disabled:opacity-50"
          >
            {expanded ? "Хаах" : "Дахин холбох"}
          </button>
          <button
            onClick={handleUnlink}
            disabled={isPending}
            className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            Тайлах
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 p-2">
          {actionError && (
            <p className="mb-2 rounded bg-red-500/10 px-2 py-1 text-xs text-red-400">{actionError}</p>
          )}
          <div className="flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
              placeholder="TMDB-ээс хайх..."
              className="w-64 rounded border border-white/10 bg-surface px-2 py-1.5 text-xs outline-none placeholder:text-muted focus:border-accent/60"
            />
            <button
              onClick={() => runSearch(query)}
              disabled={isPending}
              className="rounded border border-white/10 px-3 py-1.5 text-xs text-muted transition hover:text-foreground disabled:opacity-50"
            >
              Хайх
            </button>
          </div>

          {isPending && <p className="mt-2 text-xs text-muted">Уншиж байна...</p>}

          {!isPending && searched && results?.length === 0 && (
            <p className="mt-2 text-xs text-muted">Илэрц олдсонгүй.</p>
          )}

          {!isPending && results && results.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              {results.slice(0, 6).map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded p-1.5 ring-1 ring-white/5">
                  <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-surface">
                    {posterUrl(m.poster_path) && (
                      <Image
                        src={posterUrl(m.poster_path)!}
                        alt={m.title}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-xs font-medium">
                    {m.title} <span className="text-muted">({releaseYear(m) ?? "?"})</span>
                  </p>
                  <button
                    onClick={() => handleRelink(m.id)}
                    disabled={isPending}
                    className="shrink-0 rounded bg-accent px-2 py-1 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
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
