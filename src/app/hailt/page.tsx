import { Metadata } from "next";
import MovieGrid from "@/components/MovieGrid";
import { getGenres, searchMovies } from "@/lib/queries";

interface Props {
  searchParams: Promise<{ q?: string; genre?: string; year?: string }>;
}

export const metadata: Metadata = {
  title: "Хайлт",
  description: "Кино нэр, жанр, оноор хайх.",
};

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const genreId = sp.genre ? Number(sp.genre) || undefined : undefined;
  const year = sp.year ? Number(sp.year) || undefined : undefined;

  const [genres, movies] = await Promise.all([
    getGenres(),
    searchMovies({ q, genreId, year }),
  ]);

  const activeGenre = genres.find((g) => g.id === genreId);

  return (
    <div className="mt-8">
      <h1 className="text-2xl font-extrabold">
        {q ? `«${q}» хайлтын илэрц` : activeGenre ? `${activeGenre.name_mn} кинонууд` : "Хайлт"}
      </h1>

      <form method="get" action="/hailt" className="mt-5 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Кино нэр
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Монгол эсвэл англи нэр..."
            className="w-56 rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent/60"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Жанр
          <select
            name="genre"
            defaultValue={genreId ?? ""}
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
            defaultValue={year ?? ""}
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

      <div className="mt-8">
        <MovieGrid movies={movies} />
      </div>
    </div>
  );
}
