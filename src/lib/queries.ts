import { getDb } from "./supabase";
import { Channel, Genre, Movie, MovieWithGenres, TvShow, TvShowWithGenres, Video, VideoWithChannel } from "./types";

export type MovieCardChannel = Pick<Channel, "id" | "title" | "avatar_url">;

export type MovieCardData = Pick<
  Movie,
  "id" | "slug" | "title" | "title_mn" | "year" | "poster_path" | "vote_average"
> & { channels: MovieCardChannel[]; topViews?: number | null };

const MOVIE_CARD_COLS = "id, slug, title, title_mn, year, poster_path, vote_average";

export type TvShowCardData = Pick<
  TvShow,
  "id" | "slug" | "title" | "title_mn" | "year" | "poster_path" | "vote_average"
> & { channels: MovieCardChannel[] };

const TV_SHOW_CARD_COLS = "id, slug, title, title_mn, year, poster_path, vote_average";

/** Batch-attaches the distinct channels that uploaded a recap for each movie/show (card badges). */
async function attachChannels<T extends { id: number }>(
  items: T[],
  column: "movie_id" | "tv_show_id" = "movie_id"
): Promise<(T & { channels: MovieCardChannel[] })[]> {
  if (items.length === 0) return [];
  const db = getDb();
  const { data, error } = await db
    .from("videos")
    .select(`${column}, channels(id, title, avatar_url)`)
    .in(
      column,
      items.map((m) => m.id)
    )
    .eq("is_available", true);
  if (error) throw error;

  const channelsByItem = new Map<number, Map<string, MovieCardChannel>>();
  for (const row of data ?? []) {
    const channel = row.channels as unknown as MovieCardChannel | null;
    const itemId = row[column as keyof typeof row] as unknown as number | null;
    if (!channel || itemId === null) continue;
    if (!channelsByItem.has(itemId)) channelsByItem.set(itemId, new Map());
    channelsByItem.get(itemId)!.set(channel.id, channel);
  }

  return items.map((m) => ({ ...m, channels: Array.from(channelsByItem.get(m.id)?.values() ?? []) }));
}

/** Batch-attaches each movie's single highest available-video view count (not summed across channels). */
async function attachTopViews<T extends { id: number }>(
  items: T[]
): Promise<(T & { topViews: number | null })[]> {
  if (items.length === 0) return [];
  const db = getDb();
  const { data, error } = await db
    .from("videos")
    .select("movie_id, view_count")
    .in(
      "movie_id",
      items.map((m) => m.id)
    )
    .eq("is_available", true)
    .order("view_count", { ascending: false, nullsFirst: false });
  if (error) throw error;

  // Globally sorted desc, so the first row seen per movie is its max.
  const topByMovie = new Map<number, number | null>();
  for (const row of data ?? []) {
    if (row.movie_id === null || topByMovie.has(row.movie_id)) continue;
    topByMovie.set(row.movie_id, row.view_count);
  }
  return items.map((m) => ({ ...m, topViews: topByMovie.get(m.id) ?? null }));
}

export type TopPlayedMovie = Omit<MovieCardData, "channels"> & { play_count: number };

/** Movies ranked by plays of our own embedded player (not YouTube's view_count). */
export async function getTopPlayedMovies(limit = 10): Promise<TopPlayedMovie[]> {
  const db = getDb();
  const { data, error } = await db.rpc("top_played_movies", { result_limit: limit });
  if (error) throw error;
  return (data ?? []) as TopPlayedMovie[];
}

export interface AdminMatchCount {
  username: string;
  match_count: number;
}

/** How many videos each admin has manually matched to a movie. */
export async function getMatchesByAdmin(): Promise<AdminMatchCount[]> {
  const db = getDb();
  const { data, error } = await db.rpc("matches_by_admin");
  if (error) throw error;
  return (data ?? []) as AdminMatchCount[];
}

/** Latest matched videos, deduplicated into unique movies (newest first). */
export async function getLatestMovies(limit = 12): Promise<MovieCardData[]> {
  const db = getDb();
  const { data, error } = await db
    .from("videos")
    .select(`movie_id, published_at, movies(${MOVIE_CARD_COLS})`)
    .eq("is_available", true)
    .not("movie_id", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit * 3);
  if (error) throw error;

  const seen = new Set<number>();
  const movies: Omit<MovieCardData, "channels">[] = [];
  for (const row of data ?? []) {
    const movie = row.movies as unknown as Omit<MovieCardData, "channels"> | null;
    if (movie && !seen.has(movie.id)) {
      seen.add(movie.id);
      movies.push(movie);
      if (movies.length >= limit) break;
    }
  }
  return attachChannels(movies);
}

/** Most-viewed matched videos, deduplicated into unique movies. */
export async function getPopularMovies(limit = 12): Promise<MovieCardData[]> {
  const db = getDb();
  const { data, error } = await db
    .from("videos")
    .select(`movie_id, view_count, movies(${MOVIE_CARD_COLS})`)
    .eq("is_available", true)
    .not("movie_id", "is", null)
    .order("view_count", { ascending: false, nullsFirst: false })
    .limit(limit * 3);
  if (error) throw error;

  const seen = new Set<number>();
  const movies: Omit<MovieCardData, "channels">[] = [];
  for (const row of data ?? []) {
    const movie = row.movies as unknown as Omit<MovieCardData, "channels"> | null;
    if (movie && !seen.has(movie.id)) {
      seen.add(movie.id);
      movies.push(movie);
      if (movies.length >= limit) break;
    }
  }
  return attachChannels(movies);
}

/** Highest-rated movies (TMDB score) that have at least one available video. */
export async function getTopRatedMovies(limit = 12): Promise<MovieCardData[]> {
  const db = getDb();
  const { data, error } = await db
    .from("movies")
    .select(`${MOVIE_CARD_COLS}, videos!inner(id)`)
    .eq("videos.is_available", true)
    .not("vote_average", "is", null)
    .order("vote_average", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return attachChannels((data ?? []) as unknown as Omit<MovieCardData, "channels">[]);
}

/** Movies in a genre that have at least one available video. */
export async function getMoviesByGenre(genreId: number, limit = 12): Promise<MovieCardData[]> {
  const db = getDb();
  const { data, error } = await db
    .from("movies")
    .select(`${MOVIE_CARD_COLS}, movie_genres!inner(genre_id), videos!inner(id)`)
    .eq("movie_genres.genre_id", genreId)
    .eq("videos.is_available", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return attachChannels((data ?? []) as unknown as Omit<MovieCardData, "channels">[]);
}

/** Movies produced in a given country (ISO 3166-1 code) with an available video. */
export async function getMoviesByCountry(countryCode: string, limit = 12): Promise<MovieCardData[]> {
  const db = getDb();
  const { data, error } = await db
    .from("movies")
    .select(`${MOVIE_CARD_COLS}, videos!inner(id)`)
    .contains("production_countries", [countryCode])
    .eq("videos.is_available", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return attachChannels((data ?? []) as unknown as Omit<MovieCardData, "channels">[]);
}

/** Number of movies (with at least one available video) per country code. */
export async function getCountryMovieCounts(): Promise<Record<string, number>> {
  const db = getDb();
  const { data, error } = await db
    .from("movies")
    .select("production_countries, videos!inner(id)")
    .eq("videos.is_available", true);
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    for (const code of row.production_countries ?? []) {
      counts[code] = (counts[code] ?? 0) + 1;
    }
  }
  return counts;
}

export type MovieTableChannel = MovieCardChannel & { view_count: number };
export type MovieTableRow = Omit<MovieCardData, "channels"> & { channels: MovieTableChannel[] };

/**
 * Every movie with at least one available video, for the full table listing.
 * Each channel comes with the summed view_count of its recap video(s) for
 * that movie (most-viewed channel first).
 */
export async function getAllMoviesForTable(limit = 1000): Promise<MovieTableRow[]> {
  const db = getDb();
  const { data: movies, error } = await db
    .from("movies")
    .select(`${MOVIE_CARD_COLS}, videos!inner(id)`)
    .eq("videos.is_available", true)
    .order("year", { ascending: false, nullsFirst: false })
    .order("title", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const baseMovies = (movies ?? []) as unknown as Omit<MovieCardData, "channels">[];
  if (baseMovies.length === 0) return [];

  const { data: videoRows, error: vErr } = await db
    .from("videos")
    .select("movie_id, view_count, channels(id, title, avatar_url)")
    .in(
      "movie_id",
      baseMovies.map((m) => m.id)
    )
    .eq("is_available", true);
  if (vErr) throw vErr;

  const channelsByMovie = new Map<number, Map<string, MovieTableChannel>>();
  for (const row of videoRows ?? []) {
    const channel = row.channels as unknown as MovieCardChannel | null;
    if (!channel || row.movie_id === null) continue;
    if (!channelsByMovie.has(row.movie_id)) channelsByMovie.set(row.movie_id, new Map());
    const perMovie = channelsByMovie.get(row.movie_id)!;
    const views = row.view_count ?? 0;
    const existing = perMovie.get(channel.id);
    if (existing) existing.view_count += views;
    else perMovie.set(channel.id, { ...channel, view_count: views });
  }

  return baseMovies.map((m) => ({
    ...m,
    channels: Array.from(channelsByMovie.get(m.id)?.values() ?? []).sort(
      (a, b) => b.view_count - a.view_count
    ),
  }));
}

export type TopViewedMovieRow = Omit<MovieCardData, "channels"> & {
  topViews: number | null;
  topChannel: MovieCardChannel;
};

/**
 * Every movie with an available video, ranked by its single highest-viewed
 * recap (not summed across channels). Admin-only: /admin/top-views.
 * Paginated past PostgREST's 1000-row cap so the ranking covers every video,
 * not just the first page — see fetchAllRows in lib/ingest.ts for the same
 * pattern.
 */
export async function getMoviesRankedByViews(): Promise<TopViewedMovieRow[]> {
  const db = getDb();
  const PAGE_SIZE = 1000;
  type Row = {
    movie_id: number | null;
    view_count: number | null;
    channels: MovieCardChannel | null;
    movies: Omit<MovieCardData, "channels"> | null;
  };
  const rows: Row[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("videos")
      .select(`movie_id, view_count, channels(id, title, avatar_url), movies(${MOVIE_CARD_COLS})`)
      .eq("is_available", true)
      .not("movie_id", "is", null)
      .order("view_count", { ascending: false, nullsFirst: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as Row[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const seen = new Set<number>();
  const result: TopViewedMovieRow[] = [];
  for (const row of rows) {
    if (row.movie_id === null || seen.has(row.movie_id) || !row.movies || !row.channels) continue;
    seen.add(row.movie_id);
    result.push({ ...row.movies, topViews: row.view_count, topChannel: row.channels });
  }
  return result;
}

export interface AdminMovieVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  view_count: number | null;
  channel: MovieCardChannel;
}

export type AdminMovieRow = Omit<MovieCardData, "channels"> & { videos: AdminMovieVideo[] };

/**
 * Every movie with its individual linked videos (not aggregated per channel),
 * for the admin table where a wrongly-matched video needs to be re-linked,
 * unlinked, or the whole movie deleted.
 */
export async function getAllMoviesForAdmin(limit = 1000): Promise<AdminMovieRow[]> {
  const db = getDb();
  const { data: movies, error } = await db
    .from("movies")
    .select(`${MOVIE_CARD_COLS}, videos!inner(id)`)
    .eq("videos.is_available", true)
    .order("year", { ascending: false, nullsFirst: false })
    .order("title", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const baseMovies = (movies ?? []) as unknown as Omit<MovieCardData, "channels">[];
  if (baseMovies.length === 0) return [];

  const { data: videoRows, error: vErr } = await db
    .from("videos")
    .select("id, title, thumbnail_url, view_count, movie_id, channels(id, title, avatar_url)")
    .in(
      "movie_id",
      baseMovies.map((m) => m.id)
    )
    .eq("is_available", true)
    .order("view_count", { ascending: false, nullsFirst: false });
  if (vErr) throw vErr;

  const videosByMovie = new Map<number, AdminMovieVideo[]>();
  for (const row of videoRows ?? []) {
    if (row.movie_id === null) continue;
    const channel = row.channels as unknown as MovieCardChannel | null;
    if (!channel) continue;
    if (!videosByMovie.has(row.movie_id)) videosByMovie.set(row.movie_id, []);
    videosByMovie.get(row.movie_id)!.push({
      id: row.id,
      title: row.title,
      thumbnail_url: row.thumbnail_url,
      view_count: row.view_count,
      channel,
    });
  }

  return baseMovies.map((m) => ({ ...m, videos: videosByMovie.get(m.id) ?? [] }));
}

export type AdminTvShowRow = Omit<TvShowCardData, "channels"> & { videos: AdminMovieVideo[] };

/** Same as getAllMoviesForAdmin but for TV shows. */
export async function getAllTvShowsForAdmin(limit = 1000): Promise<AdminTvShowRow[]> {
  const db = getDb();
  const { data: shows, error } = await db
    .from("tv_shows")
    .select(`${TV_SHOW_CARD_COLS}, videos!inner(id)`)
    .eq("videos.is_available", true)
    .order("year", { ascending: false, nullsFirst: false })
    .order("title", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const baseShows = (shows ?? []) as unknown as Omit<TvShowCardData, "channels">[];
  if (baseShows.length === 0) return [];

  const { data: videoRows, error: vErr } = await db
    .from("videos")
    .select("id, title, thumbnail_url, view_count, tv_show_id, channels(id, title, avatar_url)")
    .in(
      "tv_show_id",
      baseShows.map((s) => s.id)
    )
    .eq("is_available", true)
    .order("view_count", { ascending: false, nullsFirst: false });
  if (vErr) throw vErr;

  const videosByShow = new Map<number, AdminMovieVideo[]>();
  for (const row of videoRows ?? []) {
    if (row.tv_show_id === null) continue;
    const channel = row.channels as unknown as MovieCardChannel | null;
    if (!channel) continue;
    if (!videosByShow.has(row.tv_show_id)) videosByShow.set(row.tv_show_id, []);
    videosByShow.get(row.tv_show_id)!.push({
      id: row.id,
      title: row.title,
      thumbnail_url: row.thumbnail_url,
      view_count: row.view_count,
      channel,
    });
  }

  return baseShows.map((s) => ({ ...s, videos: videosByShow.get(s.id) ?? [] }));
}

export async function getGenres(): Promise<Genre[]> {
  const db = getDb();
  const { data, error } = await db.from("genres").select("*").order("name_mn");
  if (error) throw error;
  return (data ?? []) as Genre[];
}

/** Number of movies (with at least one available video) per genre id. */
export async function getGenreMovieCounts(): Promise<Record<number, number>> {
  const db = getDb();
  const { data, error } = await db
    .from("movies")
    .select("movie_genres(genre_id), videos!inner(id)")
    .eq("videos.is_available", true);
  if (error) throw error;

  const counts: Record<number, number> = {};
  for (const row of data ?? []) {
    const links = row.movie_genres as unknown as { genre_id: number }[];
    for (const link of links ?? []) {
      counts[link.genre_id] = (counts[link.genre_id] ?? 0) + 1;
    }
  }
  return counts;
}

export async function getMovieBySlug(
  slug: string
): Promise<(MovieWithGenres & { videos: VideoWithChannel[] }) | null> {
  const db = getDb();
  const { data: movie, error } = await db
    .from("movies")
    .select("*, movie_genres(genres(*))")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!movie) return null;

  const { data: videos, error: vErr } = await db
    .from("videos")
    .select("*, channels(id, title, avatar_url)")
    .eq("movie_id", movie.id)
    .eq("is_available", true)
    .order("view_count", { ascending: false, nullsFirst: false });
  if (vErr) throw vErr;

  return {
    ...(movie as unknown as MovieWithGenres),
    videos: (videos ?? []) as unknown as VideoWithChannel[],
  };
}

export async function getTvShowBySlug(
  slug: string
): Promise<(TvShowWithGenres & { videos: VideoWithChannel[] }) | null> {
  const db = getDb();
  const { data: show, error } = await db
    .from("tv_shows")
    .select("*, tv_show_genres(genres(*))")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!show) return null;

  const { data: videos, error: vErr } = await db
    .from("videos")
    .select("*, channels(id, title, avatar_url)")
    .eq("tv_show_id", show.id)
    .eq("is_available", true)
    .order("view_count", { ascending: false, nullsFirst: false });
  if (vErr) throw vErr;

  return {
    ...(show as unknown as TvShowWithGenres),
    videos: (videos ?? []) as unknown as VideoWithChannel[],
  };
}

/** Latest matched TV shows, deduplicated (newest first). */
export async function getLatestTvShows(limit = 12): Promise<TvShowCardData[]> {
  const db = getDb();
  const { data, error } = await db
    .from("videos")
    .select(`tv_show_id, published_at, tv_shows(${TV_SHOW_CARD_COLS})`)
    .eq("is_available", true)
    .not("tv_show_id", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit * 3);
  if (error) throw error;

  const seen = new Set<number>();
  const shows: Omit<TvShowCardData, "channels">[] = [];
  for (const row of data ?? []) {
    const show = row.tv_shows as unknown as Omit<TvShowCardData, "channels"> | null;
    if (show && !seen.has(show.id)) {
      seen.add(show.id);
      shows.push(show);
      if (shows.length >= limit) break;
    }
  }
  return attachChannels(shows, "tv_show_id");
}

/** Every TV show with at least one available video, for the /tv listing. */
export async function getAllTvShows(limit = 1000): Promise<TvShowCardData[]> {
  const db = getDb();
  const { data, error } = await db
    .from("tv_shows")
    .select(`${TV_SHOW_CARD_COLS}, videos!inner(id)`)
    .eq("videos.is_available", true)
    .order("year", { ascending: false, nullsFirst: false })
    .order("title", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return attachChannels((data ?? []) as unknown as Omit<TvShowCardData, "channels">[], "tv_show_id");
}

export async function getChannelWithVideos(channelId: string): Promise<{
  channel: Channel;
  videos: (Video & {
    movies: Omit<MovieCardData, "channels"> | null;
    tv_shows: Omit<TvShowCardData, "channels"> | null;
  })[];
} | null> {
  const db = getDb();
  const { data: channel, error } = await db
    .from("channels")
    .select("*")
    .eq("id", channelId)
    .maybeSingle();
  if (error) throw error;
  if (!channel) return null;

  const { data: videos, error: vErr } = await db
    .from("videos")
    .select(`*, movies(${MOVIE_CARD_COLS}), tv_shows(${TV_SHOW_CARD_COLS})`)
    .eq("channel_id", channelId)
    .eq("is_available", true)
    .order("view_count", { ascending: false, nullsFirst: false })
    .limit(200);
  if (vErr) throw vErr;

  return {
    channel: channel as Channel,
    videos: (videos ?? []) as unknown as (Video & {
      movies: Omit<MovieCardData, "channels"> | null;
      tv_shows: Omit<TvShowCardData, "channels"> | null;
    })[],
  };
}

/** Distinct movies this channel has an available recap for, most-viewed first. */
export async function getChannelMovies(channelId: string, limit = 100): Promise<MovieCardData[]> {
  const db = getDb();
  const { data, error } = await db
    .from("videos")
    .select(`movie_id, view_count, movies(${MOVIE_CARD_COLS})`)
    .eq("channel_id", channelId)
    .eq("is_available", true)
    .not("movie_id", "is", null)
    .order("view_count", { ascending: false, nullsFirst: false })
    .limit(limit * 3);
  if (error) throw error;

  const seen = new Set<number>();
  const movies: Omit<MovieCardData, "channels">[] = [];
  for (const row of data ?? []) {
    const movie = row.movies as unknown as Omit<MovieCardData, "channels"> | null;
    if (movie && !seen.has(movie.id)) {
      seen.add(movie.id);
      movies.push(movie);
      if (movies.length >= limit) break;
    }
  }
  return attachChannels(movies);
}

export async function getActiveChannels(): Promise<Channel[]> {
  const db = getDb();
  const { data, error } = await db
    .from("channels")
    .select("*")
    .eq("is_active", true)
    .order("title");
  if (error) throw error;
  return (data ?? []) as Channel[];
}

export interface MovieSearchParams {
  q?: string;
  genreId?: number;
  year?: number;
  countryCode?: string;
  limit?: number;
}

export async function searchMovies(params: MovieSearchParams): Promise<MovieCardData[]> {
  const db = getDb();
  let query = db
    .from("movies")
    .select(
      params.genreId
        ? `${MOVIE_CARD_COLS}, movie_genres!inner(genre_id), videos!inner(id)`
        : `${MOVIE_CARD_COLS}, videos!inner(id)`
    )
    .eq("videos.is_available", true);

  if (params.q) {
    // strip characters that break the PostgREST or() filter syntax
    const safe = params.q.replace(/[,()%]/g, " ").trim();
    if (safe) query = query.or(`title.ilike.%${safe}%,title_mn.ilike.%${safe}%`);
  }
  if (params.genreId) query = query.eq("movie_genres.genre_id", params.genreId);
  if (params.year) query = query.eq("year", params.year);
  if (params.countryCode) query = query.contains("production_countries", [params.countryCode]);

  // Fetch a generous candidate set (results are re-ranked by view count below,
  // which isn't a movies column, so it can't be pushed down into the query).
  const { data, error } = await query.limit(500);
  if (error) throw error;

  const withChannels = await attachChannels((data ?? []) as unknown as Omit<MovieCardData, "channels">[]);
  const withViews = await attachTopViews(withChannels);
  withViews.sort((a, b) => (b.topViews ?? 0) - (a.topViews ?? 0));
  return withViews.slice(0, params.limit ?? 60);
}
