-- Multiple admin accounts (replaces the single ADMIN_PASSWORD env var).
-- Passwords are hashed with pgcrypto's bcrypt so nothing plaintext ever
-- leaves Postgres; the app only ever calls verify_admin_login/upsert.

create extension if not exists pgcrypto;

create table admin_users (
  username      text primary key,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

alter table admin_users enable row level security;

create or replace function verify_admin_login(p_username text, p_password text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from admin_users
    where username = p_username
      and password_hash = crypt(p_password, password_hash)
  );
$$;

create or replace function upsert_admin_user(p_username text, p_password text)
returns void
language sql
as $$
  insert into admin_users (username, password_hash)
  values (p_username, crypt(p_password, gen_salt('bf')))
  on conflict (username) do update set password_hash = excluded.password_hash;
$$;

-- No seed data here on purpose - this file is committed to a public repo,
-- and hardcoding a real admin password in plaintext SQL would leak it.
-- Create the first account by running this once in the Supabase SQL editor
-- (not from a file that gets committed):
--   select upsert_admin_user('admin', 'choose-a-real-password-here');
