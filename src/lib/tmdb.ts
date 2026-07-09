/**
 * TMDB API v3 wrapper (auth via v4 read access token).
 */

const API_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null, size: "w342" | "w500" | "original" = "w342") {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

export function backdropUrl(path: string | null, size: "w780" | "w1280" = "w1280") {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

function token(): string {
  const t = process.env.TMDB_API_TOKEN;
  if (!t) throw new Error("TMDB_API_TOKEN тохируулагдаагүй байна");
  return t;
}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token()}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TMDB ${path} failed (${res.status}): ${body.slice(0, 500)}`);
  }
  return res.json() as Promise<T>;
}

export interface TmdbMovie {
  id: number;
  title: string;
  original_title: string;
  release_date: string; // "2019-05-30" or ""
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  popularity: number;
  genre_ids: number[];
}

export async function searchMovie(query: string, year?: number): Promise<TmdbMovie[]> {
  const params: Record<string, string> = {
    query,
    language: "en-US",
    include_adult: "false",
    page: "1",
  };
  if (year) params.primary_release_year = String(year);

  const data = await tmdb<{ results: TmdbMovie[] }>("/search/movie", params);
  return data.results ?? [];
}

export function releaseYear(m: TmdbMovie): number | null {
  const y = m.release_date?.slice(0, 4);
  return y && /^\d{4}$/.test(y) ? Number(y) : null;
}

interface TmdbMovieDetails extends Omit<TmdbMovie, "genre_ids"> {
  genres: { id: number; name: string }[];
}

/** Fetch one movie by id (used when an admin links a video manually). */
export async function getMovieById(tmdbId: number): Promise<TmdbMovie | null> {
  try {
    const m = await tmdb<TmdbMovieDetails>(`/movie/${tmdbId}`, { language: "en-US" });
    return { ...m, genre_ids: (m.genres ?? []).map((g) => g.id) };
  } catch (err) {
    if (err instanceof Error && err.message.includes("(404)")) return null;
    throw err;
  }
}
