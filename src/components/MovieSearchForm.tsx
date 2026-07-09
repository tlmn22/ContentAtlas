import { Genre } from "@/lib/types";

export default function MovieSearchForm({
  genres,
  defaultQuery,
  defaultGenreId,
  defaultYear,
}: {
  genres: Genre[];
  defaultQuery?: string;
  defaultGenreId?: number;
  defaultYear?: number;
}) {
  return (
    <form method="get" action="/hailt" className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs text-muted">
        Кино нэр
        <input
          type="search"
          name="q"
          defaultValue={defaultQuery ?? ""}
          placeholder="Монгол эсвэл англи нэр..."
          className="w-56 rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent/60"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Жанр
        <select
          name="genre"
          defaultValue={defaultGenreId ?? ""}
          className="rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent/60"
        >
          <option value="">Бүх жанр</option>
          {genres.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name_mn}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Он
        <input
          type="number"
          name="year"
          defaultValue={defaultYear ?? ""}
          placeholder="2024"
          min={1920}
          max={new Date().getFullYear() + 1}
          className="w-24 rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent/60"
        />
      </label>
      <button
        type="submit"
        className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110"
      >
        Хайх
      </button>
    </form>
  );
}
