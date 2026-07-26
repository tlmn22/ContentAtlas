export type MatchStatus = "unmatched" | "auto" | "manual" | "ignored";

export interface Channel {
  id: string;
  title: string;
  handle: string | null;
  avatar_url: string | null;
  uploads_playlist_id: string;
  is_active: boolean;
  last_checked_at: string | null;
  last_sync_new_videos: number | null;
  created_at: string;
}

export interface Movie {
  id: number;
  tmdb_id: number;
  slug: string;
  title: string;
  original_title: string | null;
  title_mn: string | null;
  year: number | null;
  overview: string | null;
  overview_mn: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number | null;
  vote_count: number | null;
  runtime: number | null;
  imdb_id: string | null;
  budget: number | null;
  revenue: number | null;
  tagline: string | null;
  created_at: string;
}

export interface TvShow {
  id: number;
  tmdb_id: number;
  slug: string;
  title: string;
  original_title: string | null;
  title_mn: string | null;
  year: number | null;
  overview: string | null;
  overview_mn: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number | null;
  vote_count: number | null;
  number_of_seasons: number | null;
  number_of_episodes: number | null;
  status: string | null;
  tagline: string | null;
  created_at: string;
}

export interface Genre {
  id: number;
  name: string;
  name_mn: string;
}

export interface Video {
  id: string;
  channel_id: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string;
  duration_seconds: number | null;
  view_count: number | null;
  movie_id: number | null;
  tv_show_id: number | null;
  match_status: MatchStatus;
  matched_by: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export type VideoWithChannel = Video & { channels: Pick<Channel, "id" | "title" | "avatar_url"> };
export type VideoWithMovie = Video & { movies: Movie | null };
export type MovieWithGenres = Movie & { movie_genres: { genres: Genre }[] };
export type TvShowWithGenres = TvShow & { tv_show_genres: { genres: Genre }[] };
