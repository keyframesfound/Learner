-- Per-player raid decks. Each player draws from their own shuffle and moves at
-- their own pace, so the party no longer shares a round or a countdown.
alter table party_players add column if not exists pos  int not null default 0;
alter table party_players add column if not exists deck text[];
