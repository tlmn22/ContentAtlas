import MovieCard from "./MovieCard";
import { MovieCardData } from "@/lib/queries";

/** Responsive poster grid (search results, genre pages). */
export default function MovieGrid({ movies }: { movies: MovieCardData[] }) {
  if (movies.length === 0) {
    return <p className="py-12 text-center text-muted">Илэрц олдсонгүй.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 [&>a]:w-auto">
      {movies.map((m) => (
        <MovieCard key={m.id} movie={m} />
      ))}
    </div>
  );
}
