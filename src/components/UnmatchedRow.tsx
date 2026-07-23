"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatDate, formatViews } from "@/lib/format";
import { posterUrl, releaseYear, type TmdbMovie } from "@/lib/tmdb";
import { VideoWithChannel } from "@/lib/types";
import {
  deleteVideoInline,
  ignoreVideoInline,
  linkVideoInline,
  searchTmdbForVideo,
} from "@/app/admin/unmatched/actions";

export default function UnmatchedRow({
  video,
  initialQuery,
  initialYear,
  initialTitleMn,
}: {
  video: VideoWithChannel;
  initialQuery: string;
  initialYear: number | null;
  initialTitleMn: string | null;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<TmdbMovie[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runSearch(q: string) {
    setActionError(null);
    startTransition(async () => {
      const r = await searchTmdbForVideo(q, initialYear ?? undefined);
      setResults(r);
      setSearched(true);
    });
  }

  function expand() {
    setExpanded(true);
    if (!searched) runSearch(query);
  }

  function handleLink(tmdbId: number) {
    setActionError(null);
    startTransition(async () => {
      const res = await linkVideoInline(video.id, tmdbId, initialTitleMn);
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

  function handleDelete() {
    if (!confirm("Энэ бичлэгийг бүрмөсөн устгах уу?")) return;
    setActionError(null);
    startTransition(async () => {
      const res = await deleteVideoInline(video.id);
      if (!res.ok) setActionError(res.error ?? "Алдаа гарлаа");
      else router.refresh();
    });
  }

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
            {video.channels.title} · {formatViews(video.view_count)} · {formatDate(video.published_at)}
          </p>
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
            disabled={isPending}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {expanded ? "Хаах" : "Холбох"}
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            Устгах
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 p-3">
          {actionError && (
            <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{actionError}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
              placeholder="TMDB-ээс хайх (англи нэр дээр сайн ажиллана)"
              className="w-72 rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent/60"
            />
            <button
              onClick={() => runSearch(query)}
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
                        {releaseYear(m) ?? "?"} · ★ {m.vote_average?.toFixed(1) ?? "-"}
                      </span>
                    </p>
                    {m.original_title !== m.title && (
                      <p className="text-xs text-muted">{m.original_title}</p>
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
