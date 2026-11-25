-- Learner — PostgreSQL 16
-- Runtime source of truth. Content is also mirrored to /content as JSON for diffing.

begin;

create extension if not exists pgcrypto;

-- ─── enums ────────────────────────────────────────────────────────────────────
create type user_role     as enum ('student', 'teacher', 'admin');
create type lesson_status as enum ('draft', 'published', 'archived');
create type item_level    as enum ('recognize', 'recall', 'apply', 'construct');
create type block_kind    as enum ('prose','callout','code','formula','mcq','fill',
                                   'numeric','predict','challenge','structured','repl');
create type memory_state  as enum ('new', 'learning', 'review', 'relearning');

-- ─── identity ─────────────────────────────────────────────────────────────────
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  password_hash text not null,
  name          text not null,
  role          user_role not null default 'student',
  school        text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);
create unique index users_email_key on users (lower(email));

create table sessions (
  id         text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_user_idx on sessions (user_id);

-- ─── curriculum ───────────────────────────────────────────────────────────────
create table tracks (
  id     text primary key,              -- 'ict' | 'phy'
  name   text not null,
  exam   text not null default 'HKDSE',
  accent text,
  ord    int  not null default 0
);

create table modules (
  id         text primary key,          -- 'ict.e2c', 'phy.p2'
  track_id   text not null references tracks(id) on delete cascade,
  code       text not null,             -- 'E2C'
  name       text not null,
  paper      smallint,                  -- 1 | 2 | null
  compulsory boolean not null default true,
  exam_weight numeric(4,2) not null default 0,   -- share of subject mark
  ord        int not null default 0,
  unique (track_id, code)
);

create table lessons (
  id         uuid primary key default gen_random_uuid(),
  module_id  text not null references modules(id) on delete cascade,
  slug       text not null,
  title      text not null,
  summary    text not null default '',
  minutes    smallint not null default 4,
  concepts   text[] not null default '{}',
  status     lesson_status not null default 'draft',
  ord        int not null default 0,
  origin_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, slug)
);

create table blocks (
  id        uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  kind      block_kind not null,
  level     item_level,                 -- null for non-graded blocks
  ord       int not null default 0,
  concepts  text[] not null default '{}',
  requires  text[] not null default '{}',
  marks     numeric(4,1) not null default 0,
  payload   jsonb not null,             -- block minus id/kind/level/concepts
  origin_hash text,
  created_at timestamptz not null default now()
);
create index blocks_lesson_idx on blocks (lesson_id, ord);
create index blocks_kind_idx   on blocks (kind);
create index blocks_concept_idx on blocks using gin (concepts);
create index blocks_payload_idx on blocks using gin (payload jsonb_path_ops);

-- ─── classes ──────────────────────────────────────────────────────────────────
create table classes (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references users(id) on delete cascade,
  name       text not null,
  join_code  text not null unique,
  year       int,
  retention_target numeric(3,2) not null default 0.90,   -- exam mode raises this
  created_at timestamptz not null default now()
);

create table enrollments (
  class_id   uuid not null references classes(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index enrollments_student_idx on enrollments (student_id);

create table assignments (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references classes(id) on delete cascade,
  module_id    text references modules(id) on delete cascade,
  lesson_id    uuid references lessons(id) on delete cascade,
  title        text not null default '',
  due_at       timestamptz,
  published_at timestamptz not null default now(),
  check (num_nonnulls(module_id, lesson_id) = 1)
);

-- ─── attempts: the spine ──────────────────────────────────────────────────────
create table attempts (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references users(id) on delete cascade,
  block_id      uuid not null references blocks(id) on delete cascade,
  lesson_id     uuid not null references lessons(id) on delete cascade,
  module_id     text not null references modules(id) on delete cascade,
  kind          block_kind not null,
  level         item_level,
  correct       boolean,                -- null for self-marked / structured
  marks_awarded numeric(4,1),
  marks_total   numeric(4,1),
  rating        smallint,               -- FSRS: 1 again, 2 hard, 3 good, 4 easy
  answer        jsonb,
  ms            int,
  created_at    timestamptz not null default now()
);
create index attempts_user_time  on attempts (user_id, created_at desc);
create index attempts_block      on attempts (block_id, created_at desc);
create index attempts_module     on attempts (module_id, created_at desc);
create index attempts_first      on attempts (block_id, user_id, created_at);

-- ─── per-item memory state (FSRS) ────────────────────────────────────────────
create table memory_state (
  user_id      uuid not null references users(id) on delete cascade,
  block_id     uuid not null references blocks(id) on delete cascade,
  stability    real not null default 0,
  difficulty   real not null default 0,
  due_at       timestamptz,
  reps         int not null default 0,
  lapses       int not null default 0,
  state        memory_state not null default 'new',
  last_review  timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, block_id)
);
create index memory_state_due on memory_state (user_id, due_at);

-- ─── views: everything the dashboards read ───────────────────────────────────

-- First ever attempt per student per item: measures teaching, not ability.
create view v_item_first_attempt as
select distinct on (user_id, block_id)
       user_id, block_id, lesson_id, module_id, kind, level, correct, ms, created_at
from attempts
where correct is not null
order by user_id, block_id, created_at asc;

-- Class-level per-item failure ranking, with the misconception to reteach.
create view v_class_item_failures as
select e.class_id,
       a.block_id, a.lesson_id, a.module_id, a.kind,
       count(*)                                                as attempts_n,
       count(distinct a.user_id)                               as students_n,
       count(*) filter (where a.correct is false)              as wrong_n,
       round(100.0 * count(*) filter (where a.correct is false)
             / nullif(count(*) filter (where a.correct is not null), 0), 1) as fail_pct,
       round(avg(a.ms))::int                                   as avg_ms
from attempts a
join enrollments e on e.student_id = a.user_id
where a.correct is not null
group by 1,2,3,4,5;

-- Concept mastery per student over the last 10 graded attempts.
create view v_concept_mastery as
with recent as (
  select a.user_id, c.concept, a.correct, a.created_at,
         row_number() over (partition by a.user_id, c.concept order by a.created_at desc) as rn
  from attempts a
  cross join lateral unnest(a.block_id::text || '') as _dummy(d)
  join blocks b on b.id = a.block_id
  cross join lateral unnest(b.concepts) as c(concept)
  where a.correct is not null
)
select user_id, concept,
       count(*)                                                        as graded_n,
       count(*) filter (where correct)                                 as correct_n,
       round(100.0 * count(*) filter (where correct) / count(*), 1)    as accuracy,
       max(created_at)                                                 as last_at
from recent
where rn <= 10
group by 1,2;

-- Honest retention: items first correct on day 0, re-measured a week later.
create view v_retention_7d as
with day0 as (
  select user_id, block_id, min(created_at) as first_correct_at
  from attempts where correct is true
  group by 1,2
)
select d.user_id, d.block_id, d.first_correct_at,
       count(a.id)                                          as later_attempts,
       count(a.id) filter (where a.correct)                 as later_correct,
       round(100.0 * count(a.id) filter (where a.correct)
             / nullif(count(a.id) filter (where a.correct is not null), 0), 1) as retention_pct
from day0 d
join attempts a
  on a.user_id = d.user_id
 and a.block_id = d.block_id
 and a.created_at >= d.first_correct_at + interval '7 days'
group by 1,2,3;

-- What the student should do next.
create view v_due as
select m.user_id, m.block_id, m.due_at, m.state, m.stability, m.lapses,
       b.lesson_id, b.module_id, b.kind, b.level
from memory_state m
join blocks b on b.id = m.block_id
where m.due_at <= now()
order by m.due_at asc;

-- Exam readiness, weighted by the assessment framework rather than by lesson count.
create view v_paper1_readiness as
select a.user_id,
       round(sum(case when m.paper = 1 and a.level = 'construct'
                      then a.marks_awarded else 0 end)
             / nullif(sum(case when m.paper = 1 and a.level = 'construct'
                               then a.marks_total else 0 end), 0) * 100, 1) as structured_pct,
       round(100.0 * count(*) filter (where m.paper = 1 and a.correct)
             / nullif(count(*) filter (where m.paper = 1 and a.correct is not null), 0), 1) as mcq_pct
from attempts a
join modules m on m.id = a.module_id
where a.created_at > now() - interval '60 days'
group by 1;

-- Daily board: who faced the most distinct items today.
-- Ranked on volume, not accuracy, so a weak student can win by showing up and a
-- strong student cannot win by only answering what they already know.
create view v_daily_board as
with per_day as (
  select e.class_id,
         a.user_id,
         (a.created_at at time zone 'Asia/Hong_Kong')::date as day,
         count(distinct a.block_id)                          as items,
         count(*) filter (where a.correct is true)            as correct_n,
         count(*) filter (where a.correct is not null)        as graded_n,
         max(a.created_at)                                    as last_at
  from attempts a
  join enrollments e on e.student_id = a.user_id
  group by 1, 2, 3
)
select p.class_id, p.day, p.user_id, u.name,
       p.items, p.correct_n, p.graded_n,
       round(100.0 * p.correct_n / nullif(p.graded_n, 0), 0) as accuracy_pct,
       row_number() over (
         partition by p.class_id, p.day
         order by p.items desc, p.correct_n desc, p.last_at asc
       ) as rank
from per_day p
join users u on u.id = p.user_id;

-- ─── maintenance ─────────────────────────────────────────────────────────────
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger lessons_touch before update on lessons
for each row execute function touch_updated_at();

commit;

-- ─── auth (better-auth) ──────────────────────────────────────────────────────
-- Kept separate from the domain "users" table: auth identity vs. school member.
create table if not exists "user" (
  id             text primary key,
  name           text not null,
  email          text not null unique,
  email_verified boolean not null default false,
  image          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists session (
  id         text primary key,
  expires_at timestamptz not null,
  token      text not null unique,
  ip_address text,
  user_agent text,
  user_id    text not null references "user"(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists session_user_idx on session (user_id);

create table if not exists account (
  id                      text primary key,
  account_id              text not null,
  provider_id             text not null,
  user_id                 text not null references "user"(id) on delete cascade,
  access_token            text,
  refresh_token           text,
  id_token                text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope                   text,
  password                text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists account_user_idx on account (user_id);

create table if not exists verification (
  id         text primary key,
  identifier text not null,
  value      text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
