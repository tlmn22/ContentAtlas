import { getDb } from "./supabase";
import { Channel, Genre, Movie, MovieWithGenres, Video, VideoWithChannel } from "./types";

export type MovieCardChannel = Pick<Channel, "id" | "title" | "avatar_url">;

export type MovieCardData = Pick<
  Movie,
  "id" | "slug" | "title" | "title_mn" | "year" | "poster_path" | "vote_average"
> & { channels: MovieCardChannel[] };

const MOVIE_CARD_COLS = "id, slug, title, title_mn, year, poster_path, vote_average";

/** Batch-attaches the distinct channels that uploaded a recap for each movie (card badges). */
async function attachChannels<T extends { id: number }>(
  movies: T[]
): Promise<(T & { channels: MovieCardChannel[] })[]> {
  if (movies.length === 0) return [];
  const db = getDb();
  const { data, error } = await db
    .from("videos")
    .select("movie_id, channels(id, title, avatar_url)")
    .in(
      "movie_id",
      movies.map((m) => m.id)
    )
    .eq("is_available", true);
  if (error) throw error;

  const channelsByMovie = new Map<number, Map<string, MovieCardChannel>>();
  for (const row of data ?? []) {
    const channel = row.channels as unknown as MovieCardChannel | null;
    if (!channel || row.movie_id === null) continue;
    if (!channelsByMovie.has(row.movie_id)) channelsByMovie.set(row.movie_id, new Map());
    channelsByMovie.get(row.movie_id)!.set(channel.id, channel);
  }

  return movies.map((m) => ({ ...m, channels: Array.from(channelsByMovie.get(m.id)?.values() ?? []) }));
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

export async function getGenres(): Promise<Genre[]> {
  const db = getDb();
  const { data, error } = await db.from("genres").select("*").order("name_mn");
  if (error) throw error;
  return (data ?? []) as Genre[];
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

export async function getChannelWithVideos(
  channelId: string
): Promise<{
  channel: Channel;
  videos: (Video & { movies: Omit<MovieCardData, "channels"> | null })[];
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
    .select(`*, movies(${MOVIE_CARD_COLS})`)
    .eq("channel_id", channelId)
    .eq("is_available", true)
    .order("view_count", { ascending: false, nullsFirst: false })
    .limit(200);
  if (vErr) throw vErr;

  return {
    channel: channel as Channel,
    videos: (videos ?? []) as unknown as (Video & { movies: Omit<MovieCardData, "channels"> | null })[],
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

  const { data, error } = await query
    .order("year", { ascending: false, nullsFirst: false })
    .limit(params.limit ?? 60);
  if (error) throw error;
  return attachChannels((data ?? []) as unknown as Omit<MovieCardData, "channels">[]);
}
