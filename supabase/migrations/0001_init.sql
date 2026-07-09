-- Kino Recap Aggregator - initial schema
-- Run against the Supabase project database (SQL editor or `supabase db push`).

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- channels: registered YouTube channels we ingest from
-- ---------------------------------------------------------------------------
create table channels (
  id                  text primary key,              -- YouTube channel id (UC...)
  title               text not null,
  handle              text,                          -- @handle without the @
  avatar_url          text,
  uploads_playlist_id text not null,                 -- UU... playlist, used by playlistItems
  is_active           boolean not null default true,
  last_checked_at     timestamptz,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- movies: TMDB metadata, one row per movie
-- ---------------------------------------------------------------------------
create table movies (
  id            bigint generated always as identity primary key,
  tmdb_id       integer not null unique,
  slug          text not null unique,
  title         text not null,                       -- English title from TMDB
  original_title text,
  title_mn      text,                                -- Mongolian title (from video titles / manual)
  year          integer,
  overview      text,
  overview_mn   text,                                -- manual Mongolian overview, optional
  poster_path   text,                                -- TMDB path, e.g. /abc.jpg
  backdrop_path text,
  vote_average  numeric(3,1),
  created_at    timestamptz not null default now()
);

create index movies_title_trgm on movies using gin (title gin_trgm_ops);
create index movies_title_mn_trgm on movies using gin (title_mn gin_trgm_ops);
create index movies_year_idx on movies (year);

-- ---------------------------------------------------------------------------
-- genres: TMDB genres with Mongolian display names
-- ---------------------------------------------------------------------------
create table genres (
  id      integer primary key,                       -- TMDB genre id
  name    text not null,
  name_mn text not null
);

create table movie_genres (
  movie_id bigint  not null references movies(id) on delete cascade,
  genre_id integer not null references genres(id) on delete cascade,
  primary key (movie_id, genre_id)
);

create index movie_genres_genre_idx on movie_genres (genre_id);

-- ---------------------------------------------------------------------------
-- videos: ingested YouTube videos
-- ---------------------------------------------------------------------------
create table videos (
  id               text primary key,                 -- YouTube video id
  channel_id       text not null references channels(id) on delete cascade,
  title            text not null,
  thumbnail_url    text,
  published_at     timestamptz not null,
  duration_seconds integer,
  view_count       bigint,
  movie_id         bigint references movies(id) on delete set null,
  match_status     text not null default 'unmatched'
                   check (match_status in ('unmatched', 'auto', 'manual', 'ignored')),
  is_available     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index videos_channel_idx on videos (channel_id, published_at desc);
create index videos_movie_idx on videos (movie_id);
create index videos_published_idx on videos (published_at desc);
create index videos_unmatched_idx on videos (match_status) where match_status = 'unmatched';

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end
$$ language plpgsql;

create trigger videos_updated_at
  before update on videos
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- categories: flexible taxonomy so non-movie content can be added later
-- (history, science, education, ...). Movies stay in the "kino" category.
-- ---------------------------------------------------------------------------
create table categories (
  id        bigint generated always as identity primary key,
  slug      text not null unique,
  name      text not null,                           -- Mongolian display name
  parent_id bigint references categories(id) on delete set null
);

create table video_categories (
  video_id    text   not null references videos(id) on delete cascade,
  category_id bigint not null references categories(id) on delete cascade,
  primary key (video_id, category_id)
);

-- ---------------------------------------------------------------------------
-- Row level security: no anon access, the app only uses the service role key
-- on the server. Add public read policies later if a public API is needed.
-- ---------------------------------------------------------------------------
alter table channels         enable row level security;
alter table movies           enable row level security;
alter table genres           enable row level security;
alter table movie_genres     enable row level security;
alter table videos           enable row level security;
alter table categories       enable row level security;
alter table video_categories enable row level security;

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------
insert into genres (id, name, name_mn) values
  (28,    'Action',          'Тулаант'),
  (12,    'Adventure',       'Адал явдалт'),
  (16,    'Animation',       'Хүүхэлдэйн'),
  (35,    'Comedy',          'Инээдмийн'),
  (80,    'Crime',           'Гэмт хэргийн'),
  (99,    'Documentary',     'Баримтат'),
  (18,    'Drama',           'Драм'),
  (10751, 'Family',          'Гэр бүлийн'),
  (14,    'Fantasy',         'Уран зөгнөлт'),
  (36,    'History',         'Түүхэн'),
  (27,    'Horror',          'Аймшгийн'),
  (10402, 'Music',           'Хөгжмийн'),
  (9648,  'Mystery',         'Нууцлаг'),
  (10749, 'Romance',         'Хайр дурлалын'),
  (878,   'Science Fiction', 'Шинжлэх ухааны'),
  (10770, 'TV Movie',        'ТВ кино'),
  (53,    'Thriller',        'Триллер'),
  (10752, 'War',             'Дайны'),
  (37,    'Western',         'Вестерн');

insert into categories (slug, name) values ('kino', 'Кино');
