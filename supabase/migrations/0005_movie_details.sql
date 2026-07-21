-- Extra TMDB detail fields, only available from /movie/{id} (not the
-- /search/movie results used for auto-matching), so ensureMovie() now
-- backfills these with one extra TMDB call whenever it inserts a movie
-- that doesn't have them yet.

alter table movies
  add column vote_count integer,
  add column runtime    integer,
  add column imdb_id    text,
  add column budget     bigint,
  add column revenue    bigint,
  add column tagline    text;
