import { Metadata } from "next";
import MovieGrid from "@/components/MovieGrid";
import { countryLabel } from "@/lib/countries";
import { getGenres, searchMovies } from "@/lib/queries";

interface Props {
  searchParams: Promise<{ q?: string; genre?: string; year?: string; country?: string }>;
}

export const metadata: Metadata = {
  title: "Хайлт",
  description: "Кино нэр, төрөл, улс, оноор хайх.",
};

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const genreId = sp.genre ? Number(sp.genre) || undefined : undefined;
  const year = sp.year ? Number(sp.year) || undefined : undefined;
  const countryCode = sp.country?.trim().toUpperCase() || undefined;

  const [genres, movies] = await Promise.all([
    getGenres(),
    searchMovies({ q, genreId, year, countryCode }),
  ]);

  const activeGenre = genres.find((g) => g.id === genreId);

  return (
    <div className="mt-8">
      <h1 className="text-2xl font-extrabold">
        {q
          ? `«${q}» хайлтын илэрц`
          : activeGenre
            ? `${activeGenre.name_mn} кинонууд`
            : countryCode
              ? `${countryLabel(countryCode)} кино`
              : "Хайлт"}
      </h1>

      <div className="mt-8">
        <MovieGrid movies={movies} />
      </div>
    </div>
  );
}
