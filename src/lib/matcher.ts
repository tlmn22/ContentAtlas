import { SupabaseClient } from "@supabase/supabase-js";
import { normalizeForCompare, parseVideoTitle } from "./title-parser";
import {
  firstAirYear,
  getMovieById,
  getTvShowById,
  releaseYear,
  searchMovie,
  TmdbMovie,
  TmdbTvShow,
} from "./tmdb";

export interface MatchResult {
  movie: TmdbMovie;
  confidence: number;
  titleMn: string | null;
}

/**
 * Score how well a TMDB result fits a search candidate.
 * >= AUTO_MATCH_THRESHOLD is trusted for automatic linking.
 */
export const AUTO_MATCH_THRESHOLD = 4;

function scoreResult(query: string, parsedYear: number | null, m: TmdbMovie): number {
  const q = normalizeForCompare(query);
  const title = normalizeForCompare(m.title);
  const original = normalizeForCompare(m.original_title);

  let score = 0;
  if (q === title || q === original) score += 4;
  else if (title.startsWith(q) || original.startsWith(q) || q.startsWith(title)) score += 2;
  else if (title.includes(q) || q.includes(title)) score += 1;
  else {
    // token overlap
    const qTokens = new Set(q.split(" "));
    const tTokens = title.split(" ");
    const overlap = tTokens.filter((t) => qTokens.has(t)).length;
    if (tTokens.length > 0 && overlap / tTokens.length >= 0.6) score += 1;
  }

  const year = releaseYear(m);
  if (parsedYear && year) {
    if (year === parsedYear) score += 2;
    else if (Math.abs(year - parsedYear) === 1) score += 1;
    else score -= 1;
  }

  if (m.popularity > 10) score += 0.5;
  return score;
}

/**
 * Parse a video title and find the best TMDB movie.
 * Returns null when nothing clears the auto-match threshold.
 */
export async function findMovieForTitle(videoTitle: string): Promise<MatchResult | null> {
  const parsed = parseVideoTitle(videoTitle);
  if (parsed.queries.length === 0) return null;

  let best: { movie: TmdbMovie; score: number } | null = null;

  for (const query of parsed.queries) {
    // Search with year first (tighter), then without
    const attempts: (number | undefined)[] = parsed.year ? [parsed.year, undefined] : [undefined];
    for (const year of attempts) {
      const results = await searchMovie(query, year);
      for (const m of results.slice(0, 5)) {
        const score = scoreResult(query, parsed.year, m);
        if (!best || score > best.score) best = { movie: m, score };
      }
      // A confident hit on the year-scoped search - no need to widen
      if (best && best.score >= AUTO_MATCH_THRESHOLD + 1) break;
    }
    if (best && best.score >= AUTO_MATCH_THRESHOLD + 1) break;
  }

  if (!best || best.score < AUTO_MATCH_THRESHOLD) return null;
  return { movie: best.movie, confidence: best.score, titleMn: parsed.titleMn };
}

function slugify(title: string, year: number | null): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const safe = base || "kino";
  return year ? `${safe}-${year}` : safe;
}

/**
 * Insert the TMDB movie (and its genre links) if it doesn't exist yet.
 * Returns the local movies.id.
 */
export async function ensureMovie(
  db: SupabaseClient,
  tmdbMovie: TmdbMovie,
  titleMn: string | null
): Promise<number> {
  const { data: existing, error: selErr } = await db
    .from("movies")
    .select("id, title_mn")
    .eq("tmdb_id", tmdbMovie.id)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    if (titleMn && !existing.title_mn) {
      await db.from("movies").update({ title_mn: titleMn }).eq("id", existing.id);
    }
    return existing.id;
  }

  // /search/movie (auto-match path) lacks runtime/imdb_id/budget/revenue -
  // fetch the full /movie/{id} details once so every row we insert is complete.
  let details = tmdbMovie;
  if (tmdbMovie.runtime === undefined) {
    const full = await getMovieById(tmdbMovie.id);
    if (full) details = full;
  }

  const year = releaseYear(details);
  let slug = slugify(details.title, year);

  const { data: slugTaken } = await db.from("movies").select("id").eq("slug", slug).maybeSingle();
  if (slugTaken) slug = `${slug}-${details.id}`;

  const { data: inserted, error: insErr } = await db
    .from("movies")
    .insert({
      tmdb_id: details.id,
      slug,
      title: details.title,
      original_title: details.original_title,
      title_mn: titleMn,
      year,
      overview: details.overview || null,
      poster_path: details.poster_path,
      backdrop_path: details.backdrop_path,
      vote_average: details.vote_average || null,
      vote_count: details.vote_count ?? null,
      runtime: details.runtime ?? null,
      imdb_id: details.imdb_id ?? null,
      budget: details.budget || null,
      revenue: details.revenue || null,
      tagline: details.tagline || null,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;

  if (details.genre_ids?.length) {
    // Genres are pre-seeded; ignore ids TMDB adds later that we don't know
    const { data: known } = await db.from("genres").select("id").in("id", details.genre_ids);
    const rows = (known ?? []).map((g) => ({ movie_id: inserted.id, genre_id: g.id }));
    if (rows.length) await db.from("movie_genres").upsert(rows);
  }

  return inserted.id;
}

/**
 * Insert the TMDB TV show (and its genre links) if it doesn't exist yet.
 * Returns the local tv_shows.id. Mirrors ensureMovie.
 */
export async function ensureTvShow(
  db: SupabaseClient,
  tmdbShow: TmdbTvShow,
  titleMn: string | null
): Promise<number> {
  const { data: existing, error: selErr } = await db
    .from("tv_shows")
    .select("id, title_mn")
    .eq("tmdb_id", tmdbShow.id)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    if (titleMn && !existing.title_mn) {
      await db.from("tv_shows").update({ title_mn: titleMn }).eq("id", existing.id);
    }
    return existing.id;
  }

  // /search/tv (auto-match path) lacks number_of_seasons/status/tagline -
  // fetch full /tv/{id} details once so every row we insert is complete.
  let details = tmdbShow;
  if (tmdbShow.number_of_seasons === undefined) {
    const full = await getTvShowById(tmdbShow.id);
    if (full) details = full;
  }

  const year = firstAirYear(details);
  let slug = slugify(details.name, year);

  const { data: slugTaken } = await db.from("tv_shows").select("id").eq("slug", slug).maybeSingle();
  if (slugTaken) slug = `${slug}-${details.id}`;

  const { data: inserted, error: insErr } = await db
    .from("tv_shows")
    .insert({
      tmdb_id: details.id,
      slug,
      title: details.name,
      original_title: details.original_name,
      title_mn: titleMn,
      year,
      overview: details.overview || null,
      poster_path: details.poster_path,
      backdrop_path: details.backdrop_path,
      vote_average: details.vote_average || null,
      vote_count: details.vote_count ?? null,
      number_of_seasons: details.number_of_seasons ?? null,
      number_of_episodes: details.number_of_episodes ?? null,
      status: details.status ?? null,
      tagline: details.tagline || null,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;

  if (details.genre_ids?.length) {
    const { data: known } = await db.from("genres").select("id").in("id", details.genre_ids);
    const rows = (known ?? []).map((g) => ({ tv_show_id: inserted.id, genre_id: g.id }));
    if (rows.length) await db.from("tv_show_genres").upsert(rows);
  }

  return inserted.id;
}
