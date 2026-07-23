import { Metadata } from "next";
import MovieGrid from "@/components/MovieGrid";
import { getAllTvShows } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Бүх ТВ цуврал",
  description: "Манай санд бүртгэлтэй бүх ТВ цуврал.",
};

export default async function AllTvShowsPage() {
  const shows = await getAllTvShows();

  return (
    <div className="mt-8">
      <h1 className="text-2xl font-extrabold">Бүх ТВ цуврал ({shows.length})</h1>

      {shows.length === 0 ? (
        <p className="py-16 text-center text-muted">Одоогоор цуврал алга.</p>
      ) : (
        <div className="mt-6">
          <MovieGrid movies={shows} hrefPrefix="/tv" />
        </div>
      )}
    </div>
  );
}
