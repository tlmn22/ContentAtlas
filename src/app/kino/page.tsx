import { Metadata } from "next";
import MovieTable from "@/components/MovieTable";
import { getAllMoviesForTable } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Бүх кино",
  description: "Манай санд бүртгэлтэй бүх кино, жагсаалт хэлбэрээр.",
};

export default async function AllMoviesPage() {
  const movies = await getAllMoviesForTable();

  return (
    <div className="mt-8">
      <h1 className="text-2xl font-extrabold">Бүх кино ({movies.length})</h1>

      {movies.length === 0 ? (
        <p className="py-16 text-center text-muted">Одоогоор кино алга.</p>
      ) : (
        <div className="mt-6">
          <MovieTable movies={movies} />
        </div>
      )}
    </div>
  );
}
