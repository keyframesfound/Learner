import { pool } from "@/lib/db";
import { teaches } from "@/lib/teach";
import type { Viewer } from "@/lib/repo";

/* Local reads and writes for the teacher portal. lib/teach.ts stays untouched:
   anything the design needs that it does not expose lives here. */

export type ModuleRow = {
  id: string;
  code: string;
  name: string;
  track_id: string;
  track_name: string;
  lessons: number;
  questions: number;
  classes: number;
  published: number;
};

export async function moduleList(): Promise<ModuleRow[]> {
  const { rows } = await pool.query(
    `select m.id, m.code, m.name, m.track_id, t.name as track_name,
            (select count(*)::int from lessons l where l.module_id = m.id) as lessons,
            (select count(*)::int from blocks b join lessons l on l.id = b.lesson_id
              where l.module_id = m.id and b.kind = 'mcq') as questions,
            (select count(*)::int from classes c where c.module_id = m.id) as classes,
            (select count(*)::int from lessons l
              where l.module_id = m.id and l.status = 'published') as published
       from modules m join tracks t on t.id = m.track_id
      order by t.ord, m.ord, m.name`,
  );
  return rows as ModuleRow[];
}

export function pickModule(modules: ModuleRow[], classes: { module_id: string | null }[]) {
  const fromClass = classes.find((c) => c.module_id)?.module_id ?? null;
  return modules.find((m) => m.id === fromClass) ?? modules[0] ?? null;
}

export type LessonCount = { id: string; notes: number; questions: number; updated_at: string | null };

export async function lessonCounts(moduleId: string) {
  const { rows } = await pool.query(
    `select l.id,
            (select count(*)::int from blocks b
              where b.lesson_id = l.id and b.kind in ('prose','callout')) as notes,
            (select count(*)::int from blocks b
              where b.lesson_id = l.id and b.kind = 'mcq') as questions,
            l.updated_at
       from lessons l where l.module_id = $1 order by l.ord, l.created_at`,
    [moduleId],
  );
  return rows as LessonCount[];
}

export type QuestionRow = {
  id: string;
  level: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  graded: number;
  wrong: number;
};

export async function questionRows(lessonId: string) {
  const { rows } = await pool.query(
    `select b.id, b.level, b.payload, b.created_at,
            (select count(*)::int from attempts a
              where a.block_id = b.id and a.correct is not null) as graded,
            (select count(*)::int from attempts a
              where a.block_id = b.id and a.correct is false) as wrong
       from blocks b where b.lesson_id = $1 and b.kind = 'mcq'
      order by b.ord, b.created_at`,
    [lessonId],
  );
  return rows as QuestionRow[];
}

export type Evidence = { letter: string; pct: number; graded: number };

/** which wrong option students actually pick, when there is attempt data */
export async function choiceEvidence(blockId: string): Promise<Evidence | null> {
  const { rows } = await pool.query(
    `select a.answer->>'choice' as choice, count(*)::int as n
       from attempts a
      where a.block_id = $1 and a.correct is false and a.answer ? 'choice'
      group by 1 order by n desc limit 1`,
    [blockId],
  );
  const top = rows[0] as { choice: string | null; n: number } | undefined;
  if (!top || top.choice === null) return null;

  const { rows: totalRows } = await pool.query(
    "select count(*)::int as n from attempts where block_id = $1 and correct is not null",
    [blockId],
  );
  const graded = Number(totalRows[0]?.n ?? 0);
  const n = Number(top.n);
  if (!graded || !n) return null;

  const index = Number.parseInt(top.choice, 10);
  if (!Number.isFinite(index) || index < 0) return null;

  return {
    letter: String.fromCharCode(65 + index),
    pct: Math.round((100 * n) / graded),
    graded,
  };
}

export async function classLastActive(ids: string[]) {
  const out = new Map<string, string | null>();
  if (ids.length === 0) return out;

  const { rows } = await pool.query(
    `select e.class_id, max(a.created_at) as last_at
       from enrollments e join attempts a on a.user_id = e.student_id
      where e.class_id = any($1::uuid[])
      group by e.class_id`,
    [ids],
  );
  for (const r of rows as { class_id: string; last_at: string | null }[]) {
    out.set(r.class_id, r.last_at);
  }
  return out;
}

export type RosterDetail = {
  id: string;
  name: string;
  joined_at: string;
  answered: number;
  last_at: string | null;
};

export async function rosterDetail(classId: string) {
  const { rows } = await pool.query(
    `select u.id, u.name, e.joined_at,
            (select count(*)::int from attempts a
              where a.user_id = u.id and a.correct is not null) as answered,
            (select max(a.created_at) from attempts a where a.user_id = u.id) as last_at
       from enrollments e join users u on u.id = e.student_id
      where e.class_id = $1
      order by u.name`,
    [classId],
  );
  return rows as RosterDetail[];
}

export async function removeStudent(v: Viewer, classId: string, studentId: string) {
  if (!(await teaches(v, classId))) return false;
  await pool.query(
    "delete from enrollments where class_id = $1 and student_id = $2",
    [classId, studentId],
  );
  return true;
}

/* ── admin ─────────────────────────────────────────────────────────────── */

export type AdminModuleRow = {
  id: string;
  code: string;
  name: string;
  owner: string | null;
  classes: number;
  lessons: number;
  published: number;
};

export async function adminModules() {
  const { rows } = await pool.query(
    `select m.id, m.code, m.name,
            (select string_agg(distinct u.name, ', ')
               from classes c join users u on u.id = c.teacher_id
              where c.module_id = m.id) as owner,
            (select count(*)::int from classes c where c.module_id = m.id) as classes,
            (select count(*)::int from lessons l where l.module_id = m.id) as lessons,
            (select count(*)::int from lessons l
              where l.module_id = m.id and l.status = 'published') as published
       from modules m
      order by m.name`,
  );
  return rows as AdminModuleRow[];
}

export type TeacherRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  curricula: number;
};

export async function teacherRows() {
  const { rows } = await pool.query(
    `select u.id, u.name, u.email, u.role,
            (select count(distinct c.module_id)::int from classes c
              where c.teacher_id = u.id and c.module_id is not null) as curricula
       from users u
      where u.role in ('teacher','admin')
      order by u.name`,
  );
  return rows as TeacherRow[];
}

export async function schoolCounts() {
  const { rows } = await pool.query(
    `select
       (select count(*)::int from users where role in ('teacher','admin')) as teachers,
       (select count(*)::int from modules) as modules,
       (select count(*)::int from classes) as classes,
       (select count(distinct student_id)::int from enrollments) as students`,
  );
  const r = rows[0] as { teachers: number; modules: number; classes: number; students: number };
  return {
    teachers: Number(r?.teachers ?? 0),
    modules: Number(r?.modules ?? 0),
    classes: Number(r?.classes ?? 0),
    students: Number(r?.students ?? 0),
  };
}

/* ── new curriculum ────────────────────────────────────────────────────── */

export type TrackRow = { id: string; name: string };

export async function trackList() {
  const { rows } = await pool.query("select id, name from tracks order by ord, name");
  return rows as TrackRow[];
}

const slugOf = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export type Created = { ok: true; id: string } | { ok: false; error: string };

export async function createModule(input: {
  name: string;
  trackId: string;
  copyFrom: string | null;
}): Promise<Created> {
  const name = input.name.trim().slice(0, 60);
  if (name.length < 3) return { ok: false, error: "Name needs at least 3 characters." };
  if (!input.trackId) return { ok: false, error: "Pick a subject." };

  const { rows: trackRows } = await pool.query("select id from tracks where id = $1", [input.trackId]);
  if (trackRows.length === 0) return { ok: false, error: "Pick a subject." };

  const first = name.split(/\s+/)[0] ?? name;
  const code = (first.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8)) || slugOf(name).toUpperCase().slice(0, 8) || "NEW";
  const id = `${input.trackId}.${slugOf(code) || "new"}`;

  const { rows: clash } = await pool.query(
    "select 1 from modules where id = $1 or (track_id = $2 and code = $3)",
    [id, input.trackId, code],
  );
  if (clash.length > 0) {
    return { ok: false, error: "That curriculum code already exists in this subject." };
  }

  try {
    await pool.query(
      `insert into modules (id, track_id, code, name, ord)
       values ($1, $2, $3, $4, coalesce((select max(ord) + 1 from modules where track_id = $2), 1))`,
      [id, input.trackId, code, name],
    );
  } catch {
    return { ok: false, error: "Could not create that curriculum." };
  }

  if (!input.copyFrom) return { ok: true, id };

  try {
    const { rows: lessons } = await pool.query(
      `select id, slug, title, summary, minutes, concepts, ord
         from lessons where module_id = $1 order by ord, created_at`,
      [input.copyFrom],
    );
    for (const lesson of lessons as {
      id: string; slug: string; title: string; summary: string;
      minutes: number; concepts: string[]; ord: number;
    }[]) {
      const { rows: made } = await pool.query(
        `insert into lessons (module_id, slug, title, summary, minutes, concepts, status, ord)
         values ($1, $2, $3, $4, $5, $6, 'draft', $7) returning id`,
        [id, lesson.slug, lesson.title, lesson.summary, lesson.minutes, lesson.concepts, lesson.ord],
      );
      const newLesson = made[0]?.id as string | undefined;
      if (!newLesson) continue;
      await pool.query(
        `insert into blocks (lesson_id, kind, level, ord, concepts, requires, marks, payload)
         select $1, kind, level, ord, concepts, requires, marks, payload
           from blocks where lesson_id = $2`,
        [newLesson, lesson.id],
      );
    }
  } catch {
    await pool.query("delete from modules where id = $1", [id]);
    return { ok: false, error: "Could not copy the chapters from that curriculum." };
  }

  return { ok: true, id };
}

/* ── blocks ────────────────────────────────────────────────────────────── */

/** lib/teach.addBlock only accepts prose and mcq; a callout needs its own insert */
export async function insertNoteBlock(lessonId: string, kind: "prose" | "callout", md: string) {
  const { rows } = await pool.query(
    `insert into blocks (lesson_id, kind, level, ord, payload)
     values ($1, $2::block_kind, null,
             coalesce((select max(ord) + 1 from blocks where lesson_id = $1), 1), $3)
     returning id`,
    [lessonId, kind, JSON.stringify({ md })],
  );
  await pool.query("update lessons set updated_at = now() where id = $1", [lessonId]);
  return rows[0]?.id as string | undefined;
}

/* ── time, the way the design writes it ────────────────────────────────── */

const DAY = 86_400_000;

function startOfDay(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function ageShort(value: Date | string | null | undefined) {
  if (!value) return "—";
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return "—";
  const days = Math.round((+startOfDay(new Date()) - +startOfDay(then)) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days`;
  if (days < 28) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  return shortDate(then);
}

export function isStale(value: Date | string | null | undefined) {
  if (!value) return false;
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return false;
  return Math.round((+startOfDay(new Date()) - +startOfDay(then)) / DAY) >= 7;
}

export function shortDate(value: Date | string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-HK", { day: "numeric", month: "short" }).format(d);
}

export function savedLabel(value: Date | string | null | undefined) {
  if (!value) return "Nothing saved yet";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Nothing saved yet";
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
  if (mins < 1) return "Saved just now";
  if (mins < 60) return `Saved ${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Saved ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `Saved ${days} ${days === 1 ? "day" : "days"} ago`;
  return `Saved ${shortDate(d)}`;
}

const LEVEL_LABEL: Record<string, string> = {
  recognize: "Core",
  recall: "Core",
  apply: "Hard",
  construct: "Hard",
};

export function levelLabel(level: string | null | undefined) {
  return level ? LEVEL_LABEL[level] ?? "Core" : "Core";
}
