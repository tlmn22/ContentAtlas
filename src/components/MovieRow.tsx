import MovieCard from "./MovieCard";
import { MovieCardData } from "@/lib/queries";

/** Horizontally scrollable poster row (home page sections). */
export default function MovieRow({ movies }: { movies: MovieCardData[] }) {
  return (
    <div className="scroll-row -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
      {movies.map((m) => (
        <MovieCard key={m.id} movie={m} />
      ))}
    </div>
  );
}
