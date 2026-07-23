"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatViews } from "@/lib/format";
import { MovieTableRow } from "@/lib/queries";
import { posterUrl } from "@/lib/tmdb";

type SortKey = "title" | "year" | "rating";

export default function MovieTable({ movies }: { movies: MovieTableRow[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("year");
  const [sortAsc, setSortAsc] = useState(false);

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

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = (a.title_mn ?? a.title).localeCompare(b.title_mn ?? b.title);
      else if (sortKey === "year") cmp = (a.year ?? 0) - (b.year ?? 0);
      else cmp = (a.vote_average ?? 0) - (b.vote_average ?? 0);
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [movies, query, sortKey, sortAsc]);

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return null;
    return <span className="text-accent">{sortAsc ? " ▲" : " ▼"}</span>;
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

      {rows.length === 0 && <p className="py-12 text-center text-muted">Илэрц олдсонгүй.</p>}

      {/* Mobile: poster grid, title under the poster. */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:hidden">
        {rows.map((m, i) => {
          const poster = posterUrl(m.poster_path);
          const name = m.title_mn ?? m.title;
          return (
            <Link key={m.id} href={`/kino/${m.slug}`} className="group block">
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface ring-1 ring-white/5 transition group-hover:ring-accent/60">
                {poster ? (
                  <Image
                    src={poster}
                    alt={name}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-2 text-center text-xs text-muted">
                    {name}
                  </div>
                )}
                <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-muted">
                  #{i + 1}
                </span>
                {m.vote_average ? (
                  <span className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-accent">
                    ★ {Number(m.vote_average).toFixed(1)}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug group-hover:text-accent">
                {name}
              </p>
              <p className="text-xs text-muted">{m.year ?? ""}</p>
            </Link>
          );
        })}
      </div>

      {/* Desktop/tablet: full data table. */}
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-muted">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-3 font-medium"></th>
              <th className="py-2 pr-4 font-medium">Нэр</th>
              <th className="py-2 pr-4 font-medium">Он</th>
              <th className="py-2 pr-4 font-medium">Үнэлгээ</th>
              <th className="py-2 font-medium">Тайлбарласан суваг (хандалт)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => {
              const poster = posterUrl(m.poster_path);
              const name = m.title_mn ?? m.title;
              return (
                <tr key={m.id} className="border-b border-white/5 transition hover:bg-surface">
                  <td className="py-2 pr-2 text-muted">{i + 1}</td>
                  <td className="py-2 pr-3">
                    <Link href={`/kino/${m.slug}`}>
                      <span className="relative block h-24 w-16 shrink-0 overflow-hidden rounded bg-surface">
                        {poster && (
                          <Image src={poster} alt={name} fill sizes="64px" className="object-cover" />
                        )}
                      </span>
                    </Link>
                  </td>
                  <td className="py-2 pr-4 align-top">
                    <Link href={`/kino/${m.slug}`} className="hover:text-accent">
                      <p className="font-medium leading-snug">{name}</p>
                      {m.title_mn && <p className="text-xs text-muted">{m.title}</p>}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 align-top text-muted">{m.year ?? "—"}</td>
                  <td className="py-2 pr-4 align-top font-semibold text-accent">
                    {m.vote_average ? `★ ${Number(m.vote_average).toFixed(1)}` : "—"}
                  </td>
                  <td className="py-2 align-top">
                    {m.channels.length === 0 ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {m.channels.map((c) => (
                          <li key={c.id}>
                            <Link href={`/suvag/${c.id}`} className="hover:text-accent">
                              {c.title}
                            </Link>
                            <span className="text-muted"> · {formatViews(c.view_count)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
