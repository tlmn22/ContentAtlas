import Link from "next/link";
import ChannelRow from "@/components/ChannelRow";
import MovieRow from "@/components/MovieRow";
import Section from "@/components/Section";
import Sidebar from "@/components/Sidebar";
import {
  getActiveChannels,
  getGenreMovieCounts,
  getGenres,
  getLatestMovies,
  getLatestTvShows,
  getMoviesByGenre,
  getPopularMovies,
  getTopRatedMovies,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const HOME_GENRE_IDS = [28, 35, 27, 18, 878, 10749];

async function loadHome() {
  const genres = await getGenres();
  const homeGenres = HOME_GENRE_IDS.map((id) => genres.find((g) => g.id === id)).filter(
    (g) => g !== undefined
  );
  const [channels, genreCounts, latest, popular, topRated, tvShows, genreRows] = await Promise.all([
    getActiveChannels(),
    getGenreMovieCounts(),
    getLatestMovies(15),
    getPopularMovies(15),
    getTopRatedMovies(15),
    getLatestTvShows(15),
    Promise.all(
      homeGenres.map((g) => getMoviesByGenre(g.id, 15).then((movies) => ({ genre: g, movies })))
    ),
  ]);
  return { genres, channels, genreCounts, latest, popular, topRated, tvShows, genreRows };
}

export default async function HomePage() {
  let data: Awaited<ReturnType<typeof loadHome>>;
  try {
    data = await loadHome();
  } catch {
    return (
      <div className="py-24 text-center">
        <h1 className="text-xl font-bold">Тохиргоо дутуу байна</h1>
        <p className="mt-3 text-muted">
          Өгөгдлийн сантай холбогдож чадсангүй. <code>.env.local</code> файлд Supabase түлхүүрүүдээ
          тохируулаад, <code>supabase/migrations</code> доторх schema-г ажиллуулна уу.
        </p>
      </div>
    );
  }

  const { genres, channels, genreCounts, latest, popular, topRated, tvShows, genreRows } = data;
  const isEmpty = latest.length === 0 && popular.length === 0;

  return (
    <div>
      <div className="mt-8 rounded-2xl bg-gradient-to-r from-surface to-background p-6 ring-1 ring-white/5 sm:p-10">
        <h1 className="max-w-2xl text-2xl font-extrabold leading-tight sm:text-3xl">
          Кино тайлбарын нэгдсэн сан
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
          Монголын шилдэг кино тайлбар сувгуудын бичлэгүүдийг нэг дороос
        </p>
        <Link
          href="/kino"
          className="mt-4 inline-block rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Бүх киног харах
        </Link>
      </div>

      <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-start">
        {genres.length > 0 && (
          <aside className="order-2 md:order-1 md:w-48 md:shrink-0">
            <Sidebar genres={genres} counts={genreCounts} />
          </aside>
        )}

        <div className="order-1 min-w-0 flex-1 md:order-2">
          {channels.length > 0 && (
            <Section title="Бүртгэлтэй сувгууд" href="/suvag">
              <ChannelRow channels={channels} />
            </Section>
          )}

          {isEmpty ? (
            <div className="py-20 text-center text-muted">
              <p>Одоогоор контент алга. Ingestion worker ажиллуулсны дараа кинонууд энд гарч ирнэ.</p>
              <p className="mt-2 text-sm">
                <Link href="/admin" className="text-accent hover:underline">
                  /admin
                </Link>{" "}
                хуудсаар суваг нэмээд <code>npm run ingest</code> ажиллуулна уу.
              </p>
            </div>
          ) : (
            <>
              {latest.length > 0 && (
                <Section title="Шинэ нэмэгдсэн" href="/hailt">
                  <MovieRow movies={latest} />
                </Section>
              )}
              {popular.length > 0 && (
                <Section title="Их үзэлттэй">
                  <MovieRow movies={popular} />
                </Section>
              )}
              {topRated.length > 0 && (
                <Section title="Өндөр үнэлгээтэй">
                  <MovieRow movies={topRated} />
                </Section>
              )}
              {tvShows.length > 0 && (
                <Section title="ТВ цуврал" href="/tv">
                  <MovieRow movies={tvShows} hrefPrefix="/tv" />
                </Section>
              )}
              {genreRows.map(
                ({ genre, movies }) =>
                  movies.length > 0 && (
                    <Section
                      key={genre.id}
                      title={genre.name_mn}
                      href={`/hailt?genre=${genre.id}`}
                      count={genreCounts[genre.id] ?? movies.length}
                    >
                      <MovieRow movies={movies} />
                    </Section>
                  )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
