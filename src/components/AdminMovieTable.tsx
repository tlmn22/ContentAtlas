"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import AdminMovieVideoLine from "./AdminMovieVideoLine";
import { AdminMovieRow } from "@/lib/queries";
import { posterUrl } from "@/lib/tmdb";
import { deleteMovie, updateMoviePoster } from "@/app/admin/movies/actions";

type SortKey = "title" | "year" | "rating";

export default function AdminMovieTable({ movies }: { movies: AdminMovieRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("year");
  const [sortAsc, setSortAsc] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [posterEditId, setPosterEditId] = useState<number | null>(null);
  const [posterInput, setPosterInput] = useState("");
  const [posterError, setPosterError] = useState<string | null>(null);

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
      ? movies.filter(
          (m) => m.title.toLowerCase().includes(q) || (m.title_mn ?? "").toLowerCase().includes(q)
        )
      : movies;

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = (a.title_mn ?? a.title).localeCompare(b.title_mn ?? b.title);
      else if (sortKey === "year") cmp = (a.year ?? 0) - (b.year ?? 0);
      else cmp = (a.vote_average ?? 0) - (b.vote_average ?? 0);
      return sortAsc ? cmp : -cmp;
    });
  }, [movies, query, sortKey, sortAsc]);

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return null;
    return <span className="text-accent">{sortAsc ? " ▲" : " ▼"}</span>;
  }

  function handleDeleteMovie(movieId: number, title: string) {
    if (!confirm(`«${title}» кино болон түүнд холбогдсон бичлэгүүдийн холбоосыг устгах уу?`)) return;
    setDeleteError(null);
    startTransition(async () => {
      const res = await deleteMovie(movieId);
      if (!res.ok) setDeleteError(res.error ?? "Алдаа гарлаа");
      else router.refresh();
    });
  }

  function openPosterEdit(movieId: number, currentPoster: string | null) {
    setPosterError(null);
    setPosterInput(currentPoster && currentPoster.startsWith("http") ? currentPoster : "");
    setPosterEditId(movieId);
  }

  function handleSavePoster(movieId: number) {
    setPosterError(null);
    startTransition(async () => {
      const res = await updateMoviePoster(movieId, posterInput);
      if (!res.ok) setPosterError(res.error ?? "Алдаа гарлаа");
      else {
        setPosterEditId(null);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Кино нэрээр шүүх..."
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
        {rows.map((m, i) => {
          const poster = posterUrl(m.poster_path);
          const name = m.title_mn ?? m.title;
          return (
            <div key={m.id} className="rounded-xl p-3 ring-1 ring-white/5">
              <div className="flex items-start gap-3">
                <span className="w-6 shrink-0 text-center text-sm font-bold text-muted">{i + 1}</span>
                <div className="shrink-0">
                  <Link href={`/kino/${m.slug}`} target="_blank">
                    <span className="relative block h-24 w-16 overflow-hidden rounded bg-surface">
                      {poster ? (
                        <Image src={poster} alt={name} fill sizes="64px" className="object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center p-1 text-center text-[10px] text-muted">
                          Зураггүй
                        </span>
                      )}
                    </span>
                  </Link>
                  <button
                    onClick={() => openPosterEdit(m.id, m.poster_path)}
                    className="mt-1 block w-16 rounded border border-white/10 py-0.5 text-center text-[10px] text-muted transition hover:text-foreground"
                  >
                    {poster ? "Зураг солих" : "Зураг нэмэх"}
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link href={`/kino/${m.slug}`} target="_blank" className="hover:text-accent">
                        <p className="font-semibold leading-snug">{name}</p>
                        {m.title_mn && <p className="text-xs text-muted">{m.title}</p>}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">
                        {m.year ?? "—"}
                        {m.vote_average ? ` · ★ ${Number(m.vote_average).toFixed(1)}` : ""}
                        {" · "}
                        {m.videos.length} бичлэг
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteMovie(m.id, name)}
                      disabled={isPending}
                      className="shrink-0 rounded border border-red-500/30 px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Кино устгах
                    </button>
                  </div>

                  {posterEditId === m.id && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-surface p-2">
                      <input
                        type="url"
                        value={posterInput}
                        onChange={(e) => setPosterInput(e.target.value)}
                        placeholder="https://... зурагны URL (хоосон бол зураг арилна)"
                        className="min-w-0 flex-1 rounded border border-white/10 bg-background px-2 py-1 text-xs outline-none placeholder:text-muted focus:border-accent/60"
                      />
                      <button
                        onClick={() => handleSavePoster(m.id)}
                        disabled={isPending}
                        className="shrink-0 rounded bg-accent px-3 py-1 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
                      >
                        Хадгалах
                      </button>
                      <button
                        onClick={() => setPosterEditId(null)}
                        disabled={isPending}
                        className="shrink-0 rounded border border-white/10 px-3 py-1 text-xs text-muted transition hover:text-foreground disabled:opacity-50"
                      >
                        Болих
                      </button>
                      {posterError && <p className="w-full text-xs text-red-400">{posterError}</p>}
                    </div>
                  )}

                  <div className="mt-2 flex flex-col gap-1.5">
                    {m.videos.map((v) => (
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
