export type MatchStatus = "unmatched" | "auto" | "manual" | "ignored";

export interface Channel {
  id: string;
  title: string;
  handle: string | null;
  avatar_url: string | null;
  uploads_playlist_id: string;
  is_active: boolean;
  last_checked_at: string | null;
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
  match_status: MatchStatus;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export type VideoWithChannel = Video & { channels: Pick<Channel, "id" | "title" | "avatar_url"> };
export type VideoWithMovie = Video & { movies: Movie | null };
export type MovieWithGenres = Movie & { movie_genres: { genres: Genre }[] };
