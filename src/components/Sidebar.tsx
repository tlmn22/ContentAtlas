import Link from "next/link";
import { Country } from "@/lib/countries";
import { Genre } from "@/lib/types";

/**
 * Genre + country navigation. Sits left of the content column on desktop;
 * on mobile it drops to the bottom of the page (order-2) instead of
 * hiding, so it stays reachable without a toggle.
 */
export default function Sidebar({
  genres,
  counts,
  countries,
  countryCounts,
}: {
  genres: Genre[];
  counts: Record<number, number>;
  countries: Country[];
  countryCounts: Record<string, number>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Төрлөөр хайх">
        <h2 className="text-sm font-semibold text-muted">Төрөл</h2>
        <ul className="mt-3 flex flex-wrap gap-2 md:flex-col md:flex-nowrap md:gap-1">
          {genres.map((g) => (
            <li key={g.id} className="md:w-full">
              <Link
                href={`/hailt?genre=${g.id}`}
                className="flex items-center justify-between gap-2 rounded-full px-3 py-1.5 text-sm text-muted ring-1 ring-white/10 transition hover:text-accent hover:ring-accent/60 md:rounded-lg md:ring-0 md:hover:bg-surface"
              >
                <span>{g.name_mn}</span>
                <span className="text-xs">{counts[g.id] ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="Улсаар хайх">
        <h2 className="text-sm font-semibold text-muted">Улс</h2>
        <ul className="mt-3 flex flex-wrap gap-2 md:flex-col md:flex-nowrap md:gap-1">
          {countries
            .filter((c) => (countryCounts[c.code] ?? 0) > 0)
            .map((c) => (
              <li key={c.code} className="md:w-full">
                <Link
                  href={`/hailt?country=${c.code}`}
                  className="flex items-center justify-between gap-2 rounded-full px-3 py-1.5 text-sm text-muted ring-1 ring-white/10 transition hover:text-accent hover:ring-accent/60 md:rounded-lg md:ring-0 md:hover:bg-surface"
                >
                  <span>{c.name_mn}</span>
                  <span className="text-xs">{countryCounts[c.code] ?? 0}</span>
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </div>
  );
}
