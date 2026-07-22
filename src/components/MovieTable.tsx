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

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-muted">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-3 font-medium"></th>
              <th className="py-2 pr-4 font-medium">
                <button onClick={() => toggleSort("title")} className="hover:text-foreground">
                  Нэр{sortIndicator("title")}
                </button>
              </th>
              <th className="py-2 pr-4 font-medium">
                <button onClick={() => toggleSort("year")} className="hover:text-foreground">
                  Он{sortIndicator("year")}
                </button>
              </th>
              <th className="py-2 pr-4 font-medium">
                <button onClick={() => toggleSort("rating")} className="hover:text-foreground">
                  Үнэлгээ{sortIndicator("rating")}
                </button>
              </th>
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
        {rows.length === 0 && <p className="py-12 text-center text-muted">Илэрц олдсонгүй.</p>}
      </div>
    </div>
  );
}
