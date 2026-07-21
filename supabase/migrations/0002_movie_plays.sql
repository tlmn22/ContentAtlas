-- Tracks plays of the embedded YouTube player on our own site, separate
-- from the YouTube-reported view_count on videos. An append-only log
-- (rather than a simple counter column) so we can later add time-windowed
-- rankings (e.g. "trending this week") without a schema change.

create table movie_plays (
  id         bigint generated always as identity primary key,
  movie_id   bigint not null references movies(id) on delete cascade,
  video_id   text references videos(id) on delete set null,
  played_at  timestamptz not null default now()
);

create index movie_plays_movie_idx on movie_plays (movie_id, played_at desc);
create index movie_plays_played_at_idx on movie_plays (played_at desc);

alter table movie_plays enable row level security;

-- Aggregates plays per movie so ranking happens in Postgres, not by
-- pulling every log row into the app (movie_plays only grows over time).
create or replace function top_played_movies(result_limit int default 10)
returns table (
  id            bigint,
  slug          text,
  title         text,
  title_mn      text,
  year          integer,
  poster_path   text,
  vote_average  numeric,
  play_count    bigint
)
language sql
stable
as $$
  select m.id, m.slug, m.title, m.title_mn, m.year, m.poster_path, m.vote_average,
         count(mp.id) as play_count
  from movie_plays mp
  join movies m on m.id = mp.movie_id
  group by m.id
  order by play_count desc
  limit result_limit;
$$;
