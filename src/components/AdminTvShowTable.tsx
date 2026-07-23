"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import AdminMovieVideoLine from "./AdminMovieVideoLine";
import { AdminTvShowRow } from "@/lib/queries";
import { posterUrl } from "@/lib/tmdb";
import { deleteTvShow } from "@/app/admin/movies/actions";

type SortKey = "title" | "year" | "rating";

export default function AdminTvShowTable({ shows }: { shows: AdminTvShowRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("year");
  const [sortAsc, setSortAsc] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortAsc((asc) => !asc);
    else {
      setSortKey(key);
      setSortAsc(key === "title");
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? shows.filter(
          (s) => s.title.toLowerCase().includes(q) || (s.title_mn ?? "").toLowerCase().includes(q)
        )
      : shows;

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = (a.title_mn ?? a.title).localeCompare(b.title_mn ?? b.title);
      else if (sortKey === "year") cmp = (a.year ?? 0) - (b.year ?? 0);
      else cmp = (a.vote_average ?? 0) - (b.vote_average ?? 0);
      return sortAsc ? cmp : -cmp;
    });
  }, [shows, query, sortKey, sortAsc]);

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return null;
    return <span className="text-accent">{sortAsc ? " ▲" : " ▼"}</span>;
  }

  function handleDeleteShow(showId: number, title: string) {
    if (!confirm(`«${title}» цуврал болон түүнд холбогдсон бичлэгүүдийн холбоосыг устгах уу?`)) return;
    setDeleteError(null);
    startTransition(async () => {
      const res = await deleteTvShow(showId);
      if (!res.ok) setDeleteError(res.error ?? "Алдаа гарлаа");
      else router.refresh();
    });
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Цувралын нэрээр шүүх..."
        className="w-full max-w-xs rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent/60"
      />

      {deleteError && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{deleteError}</p>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-muted">
        <span>Эрэмбэ:</span>
        <button onClick={() => toggleSort("title")} className="hover:text-foreground">
          Нэр{sortIndicator("title")}
        </button>
        <button onClick={() => toggleSort("year")} className="hover:text-foreground">
          Он{sortIndicator("year")}
        </button>
        <button onClick={() => toggleSort("rating")} className="hover:text-foreground">
          Үнэлгээ{sortIndicator("rating")}
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {rows.map((s, i) => {
          const poster = posterUrl(s.poster_path);
          const name = s.title_mn ?? s.title;
          return (
            <div key={s.id} className="rounded-xl p-3 ring-1 ring-white/5">
              <div className="flex items-start gap-3">
                <span className="w-6 shrink-0 text-center text-sm font-bold text-muted">{i + 1}</span>
                <Link href={`/tv/${s.slug}`} target="_blank" className="shrink-0">
                  <span className="relative block h-24 w-16 overflow-hidden rounded bg-surface">
                    {poster && (
                      <Image src={poster} alt={name} fill sizes="64px" className="object-cover" />
                    )}
                  </span>
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link href={`/tv/${s.slug}`} target="_blank" className="hover:text-accent">
                        <p className="font-semibold leading-snug">{name}</p>
                        {s.title_mn && <p className="text-xs text-muted">{s.title}</p>}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">
                        {s.year ?? "—"}
                        {s.vote_average ? ` · ★ ${Number(s.vote_average).toFixed(1)}` : ""}
                        {" · "}
                        {s.videos.length} бичлэг
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteShow(s.id, name)}
                      disabled={isPending}
                      className="shrink-0 rounded border border-red-500/30 px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Цуврал устгах
                    </button>
                  </div>

                  <div className="mt-2 flex flex-col gap-1.5">
                    {s.videos.map((v) => (
                      <AdminMovieVideoLine key={v.id} video={v} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="py-12 text-center text-muted">Илэрц олдсонгүй.</p>}
      </div>
    </div>
  );
}
