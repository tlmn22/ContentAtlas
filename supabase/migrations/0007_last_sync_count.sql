-- Tracks how many new videos the most recent sync pulled in for a channel,
-- so /admin can show it next to last_checked_at instead of just "when".

alter table channels add column last_sync_new_videos integer;
