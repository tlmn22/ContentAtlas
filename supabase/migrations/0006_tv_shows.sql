-- TV series support, parallel to movies. TMDB keeps movies and TV shows in
-- separate endpoints/ids, so this mirrors the movies table rather than
-- trying to force both into one schema. A video links to at most one of
-- movie_id / tv_show_id.

create table tv_shows (
  id                  bigint generated always as identity primary key,
  tmdb_id             integer not null unique,
  slug                text not null unique,
  title               text not null,             -- TMDB "name"
  original_title      text,                       -- TMDB "original_name"
  title_mn            text,
  year                integer,                    -- first_air_date year
  overview            text,
  overview_mn         text,
  poster_path         text,
  backdrop_path       text,
  vote_average        numeric(3,1),
  vote_count          integer,
  number_of_seasons   integer,
  number_of_episodes  integer,
  status              text,                       -- "Ended", "Returning Series", ...
  tagline             text,
  created_at          timestamptz not null default now()
);

create extension if not exists pg_trgm;
create index tv_shows_title_trgm on tv_shows using gin (title gin_trgm_ops);
create index tv_shows_title_mn_trgm on tv_shows using gin (title_mn gin_trgm_ops);
create index tv_shows_year_idx on tv_shows (year);

create table tv_show_genres (
  tv_show_id bigint  not null references tv_shows(id) on delete cascade,
  genre_id   integer not null references genres(id) on delete cascade,
  primary key (tv_show_id, genre_id)
);

create index tv_show_genres_genre_idx on tv_show_genres (genre_id);

alter table videos add column tv_show_id bigint references tv_shows(id) on delete set null;
alter table videos add constraint videos_one_content_type
  check (movie_id is null or tv_show_id is null);

create index videos_tv_show_idx on videos (tv_show_id);

alter table tv_shows enable row level security;
alter table tv_show_genres enable row level security;

-- TMDB uses some TV-only genre ids that don't overlap with movie genres
-- (e.g. "Sci-Fi & Fantasy" instead of movies' separate "Science Fiction"
-- and "Fantasy"). Without these, ensureTvShow silently drops them.
insert into genres (id, name, name_mn) values
  (10759, 'Action & Adventure', 'Тулаант адал явдалт'),
  (10762, 'Kids',               'Хүүхдийн'),
  (10763, 'News',                'Мэдээ'),
  (10764, 'Reality',             'Бодит амьдралын'),
  (10765, 'Sci-Fi & Fantasy',    'Шинжлэх ухаан-зөгнөлт'),
  (10766, 'Soap',                'Цуврал драм'),
  (10767, 'Talk',                'Ярилцлагын'),
  (10768, 'War & Politics',      'Дайн-улс төр')
on conflict (id) do nothing;
