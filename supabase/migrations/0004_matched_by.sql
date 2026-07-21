-- Tracks which admin manually matched a video, so the team can see who
-- has been doing the matching work. Stays null for auto-matches (those
-- come from the ingestion worker, not a person) and for videos matched
-- before this column existed.

alter table videos
  add column matched_by text references admin_users(username) on delete set null;

create index videos_matched_by_idx on videos (matched_by) where matched_by is not null;

create or replace function matches_by_admin()
returns table (
  username     text,
  match_count  bigint
)
language sql
stable
as $$
  select matched_by as username, count(*) as match_count
  from videos
  where matched_by is not null
  group by matched_by
  order by match_count desc;
$$;
