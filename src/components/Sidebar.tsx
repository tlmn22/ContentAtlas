import Link from "next/link";
import { Genre } from "@/lib/types";

/**
 * Genre navigation. Sits left of the content column on desktop; on mobile
 * it drops to the bottom of the page (order-2) instead of hiding, so it
 * stays reachable without a toggle.
 */
export default function Sidebar({
  genres,
  counts,
}: {
  genres: Genre[];
  counts: Record<number, number>;
}) {
  return (
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
  );
}
