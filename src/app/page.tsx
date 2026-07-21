import Link from "next/link";
import ChannelRow from "@/components/ChannelRow";
import MovieRow from "@/components/MovieRow";
import MovieSearchForm from "@/components/MovieSearchForm";
import Section from "@/components/Section";
import {
  getActiveChannels,
  getGenres,
  getLatestMovies,
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
  const [channels, latest, popular, topRated, genreRows] = await Promise.all([
    getActiveChannels(),
    getLatestMovies(15),
    getPopularMovies(15),
    getTopRatedMovies(15),
    Promise.all(
      homeGenres.map((g) => getMoviesByGenre(g.id, 15).then((movies) => ({ genre: g, movies })))
    ),
  ]);
  return { genres, channels, latest, popular, topRated, genreRows };
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

  const { genres, channels, latest, popular, topRated, genreRows } = data;
  const isEmpty = latest.length === 0 && popular.length === 0;

  return (
    <div>
      <div className="mt-8 rounded-2xl bg-gradient-to-r from-surface to-background p-6 ring-1 ring-white/5 sm:p-10">
        <h1 className="max-w-2xl text-2xl font-extrabold leading-tight sm:text-3xl">
          Кино тайлбарын нэгдсэн сан
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
          Монголын шилдэг кино тайлбар сувгуудын бичлэгүүдийг нэг дороос — жанр, он, нэрээр нь хайж
          олоорой.
        </p>
      </div>

      {channels.length > 0 && (
        <Section title="Бүртгэлтэй сувгууд" href="/suvag">
          <ChannelRow channels={channels} />
        </Section>
      )}

      {genres.length > 0 && (
        <div className="mt-6">
          <MovieSearchForm genres={genres} />
        </div>
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
          {genreRows.map(
            ({ genre, movies }) =>
              movies.length > 0 && (
                <Section key={genre.id} title={genre.name_mn} href={`/hailt?genre=${genre.id}`}>
                  <MovieRow movies={movies} />
                </Section>
              )
          )}
        </>
      )}
    </div>
  );
}
