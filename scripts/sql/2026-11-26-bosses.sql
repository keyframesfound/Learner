-- Which boss a raid fights. Adding a boss is a code change (lib/bosses.ts) plus
-- nothing here: the column stores the id and the app falls back to 'segfault'.
alter table parties add column if not exists boss_id text not null default 'segfault';
