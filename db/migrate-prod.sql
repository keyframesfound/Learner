-- Learner — production migration (idempotent). Safe to run repeatedly.
begin;

-- identity: better-auth owns credentials; this table is the school member
alter table users alter column password_hash drop not null;
alter table users alter column password_hash set default '';
alter table users add column if not exists auth_id text;
create unique index if not exists users_auth_id_key on users (auth_id);

-- a class is a group of students pointed at one curriculum
alter table classes add column if not exists module_id text references modules(id) on delete set null;

-- quickbits: what a student has read
create table if not exists reads (
  user_id   uuid not null references users(id) on delete cascade,
  chapter   text not null,
  fragment  text not null,
  read_at   timestamptz not null default now(),
  primary key (user_id, chapter, fragment)
);

-- boss raids
create table if not exists parties (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  host_id        uuid not null references users(id) on delete cascade,
  module_id      text references modules(id) on delete set null,
  status         text not null default 'lobby' check (status in ('lobby','live','done')),
  round          int not null default 0,
  round_started  timestamptz,
  question_ids   text[] not null default '{}',
  created_at     timestamptz not null default now()
);
create index if not exists parties_code_idx on parties (code);

create table if not exists party_players (
  party_id  uuid not null references parties(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  lives     int not null default 4,
  score     int not null default 0,
  joined_at timestamptz not null default now(),
  primary key (party_id, user_id)
);

create table if not exists party_answers (
  party_id   uuid not null references parties(id) on delete cascade,
  round      int not null,
  user_id    uuid not null references users(id) on delete cascade,
  choice     int not null,
  correct    boolean not null,
  ms         int not null default 0,
  created_at timestamptz not null default now(),
  primary key (party_id, round, user_id)
);

commit;
