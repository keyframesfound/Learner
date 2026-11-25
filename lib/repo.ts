import { pool } from "./db";
import { currentUser } from "./session";

export type Role = "student" | "teacher" | "admin";

export type Viewer = {
  id: string;
  authId: string;
  email: string;
  name: string;
  role: Role;
};

const list = (v?: string) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/* staff are named in the environment, never self-declared */
function roleFor(email: string): Role {
  const e = email.toLowerCase();
  if (list(process.env.ADMIN_EMAILS).includes(e)) return "admin";
  if (list(process.env.TEACHER_EMAILS).includes(e)) return "teacher";
  return "student";
}

function toViewer(r: { id: string; auth_id: string; email: string; name: string; role: Role }): Viewer {
  return { id: r.id, authId: r.auth_id, email: r.email, name: r.name, role: r.role };
}

/** Mirror the auth identity into the school table, once per request. */
export async function ensureUser(s: {
  id: string;
  email: string;
  name?: string | null;
}): Promise<Viewer> {
  const want = roleFor(s.email);
  const { rows } = await pool.query(
    `insert into users (auth_id, email, name, role, last_seen_at)
     values ($1, $2, $3, $4, now())
     on conflict (auth_id) do update
        set email        = excluded.email,
            name         = excluded.name,
            role         = case when excluded.role = 'student' then users.role else excluded.role end,
            last_seen_at = now()
     returning id, auth_id, email, name, role`,
    [s.id, s.email, (s.name ?? "").trim() || s.email, want],
  );
  return toViewer(rows[0]);
}

/** The signed-in member, or null. Every page calls this. */
export async function viewer(): Promise<Viewer | null> {
  const s = await currentUser();
  if (!s) return null;
  try {
    return await ensureUser(s);
  } catch {
    return null;
  }
}

export async function requireViewer(): Promise<Viewer> {
  const v = await viewer();
  if (!v) throw new Error("not signed in");
  return v;
}

export const isStaff = (v: Viewer | null) => v?.role === "teacher" || v?.role === "admin";

/* ── curriculum ─────────────────────────────────────────────────────────── */

export type PathLesson = {
  id: string;
  slug: string;
  title: string;
  minutes: number;
  items: number;
  done: number;
  state: "done" | "now" | "lock";
};

export async function getModules() {
  const { rows } = await pool.query(
    `select m.id, m.code, m.name, t.id as track, t.name as track_name, t.accent,
            count(l.id) filter (where l.status = 'published')::int as lessons
       from modules m
       join tracks t on t.id = m.track_id
       left join lessons l on l.module_id = m.id
      group by m.id, m.code, m.name, t.id, t.name, t.accent, m.ord
      order by t.ord, m.ord`,
  );
  return rows;
}

export async function getPath(userId: string, moduleId?: string) {
  const mods = await getModules();
  const mod = mods.find((m) => m.id === moduleId) ?? mods[0];
  if (!mod) return { module: null, lessons: [] as PathLesson[], done: 0, total: 0 };

  const { rows } = await pool.query(
    `select l.id, l.slug, l.title, l.minutes, l.ord,
            (select count(*)::int from blocks b
              where b.lesson_id = l.id and b.kind = 'mcq') as items,
            (select count(*)::int from blocks b
              where b.lesson_id = l.id and b.kind = 'mcq'
                and exists (select 1 from attempts a
                             where a.block_id = b.id and a.user_id = $1 and a.correct))
              as done
       from lessons l
      where l.module_id = $2 and l.status = 'published'
      order by l.ord, l.created_at`,
    [userId, mod.id],
  );

  let found = false;
  const lessons: PathLesson[] = rows.map((r) => {
    const items = Number(r.items);
    const done = Number(r.done);
    let state: PathLesson["state"] = "lock";
    if (items > 0 && done >= items) state = "done";
    else if (!found) { state = "now"; found = true; }
    if (items === 0) state = "lock";
    return { id: r.id, slug: r.slug, title: r.title, minutes: Number(r.minutes), items, done, state };
  });

  return {
    module: mod as { id: string; code: string; name: string; track: string; track_name: string; accent: string | null; lessons: number },
    lessons,
    done: lessons.filter((l) => l.state === "done").length,
    total: lessons.length,
  };
}

export type PlayerItem = {
  id: string;
  level: string;
  prompt: string;
  code?: string[];
  options: { text: string; code?: boolean }[];
  answer: number;
  why: string;
  wrongWhy: string;
};

const LEVEL_LABEL: Record<string, string> = {
  recognize: "Core",
  recall: "Core",
  apply: "Hard",
  construct: "Hard",
};

export type NoteBlock =
  | { type: "p"; text: string }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "callout"; text: string };

/** "| a | b |" lines become a table; anything else is a paragraph. */
export function parseNotes(blocks: { kind: string; payload: Record<string, unknown> }[]): NoteBlock[] {
  const out: NoteBlock[] = [];
  for (const b of blocks) {
    const md = String(b.payload?.md ?? "").trim();
    if (!md) continue;
    if (b.kind === "callout") { out.push({ type: "callout", text: md }); continue; }
    const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 2 && lines.every((l) => l.startsWith("|") && l.endsWith("|"))) {
      const cells = (l: string) => l.slice(1, -1).split("|").map((c) => c.trim());
      const head = cells(lines[0]!);
      /* |---|---| is the markdown header divider, not a data row */
      const isDivider = (row: string[]) => row.length > 0 && row.every((c) => /^:?-{3,}:?$/.test(c));
      const rows = lines.slice(1).map(cells).filter((row) => row.length === head.length && !isDivider(row));
      out.push({ type: "table", head, rows });
    } else {
      out.push({ type: "p", text: md });
    }
  }
  return out;
}

export async function getLesson(slug: string) {
  const { rows } = await pool.query(
    `select l.id, l.slug, l.title, l.summary, l.minutes, l.module_id, m.code, m.name as module_name
       from lessons l join modules m on m.id = l.module_id
      where l.slug = $1 and l.status <> 'archived'
      order by (l.status = 'published') desc limit 1`,
    [slug],
  );
  const lesson = rows[0];
  if (!lesson) return null;

  const { rows: allBlocks } = await pool.query(
    "select id, kind, level, payload from blocks where lesson_id = $1 order by ord, created_at",
    [lesson.id],
  );
  const blocks = allBlocks.filter((b) => b.kind === "mcq");
  const notes = parseNotes(allBlocks);

  const items: PlayerItem[] = blocks.map((b) => ({
    id: b.id,
    level: LEVEL_LABEL[b.level ?? "recognize"] ?? "Core",
    prompt: b.payload.prompt ?? "",
    code: Array.isArray(b.payload.code) ? b.payload.code : undefined,
    options: (b.payload.options ?? []).map((o: { text: string; code?: boolean }) => ({
      text: o.text,
      code: !!o.code,
    })),
    answer: Number(b.payload.answer ?? 0),
    why: b.payload.why ?? "",
    wrongWhy: b.payload.wrongWhy ?? b.payload.why ?? "",
  }));

  return { lesson, items, notes };
}

export async function recordAnswer(args: {
  userId: string;
  lessonId: string;
  moduleId: string;
  blockId: string;
  choice: number;
  correct: boolean;
  ms: number;
}) {
  const { userId, lessonId, moduleId, blockId, choice, correct, ms } = args;
  await pool.query(
    `insert into attempts (user_id, block_id, lesson_id, module_id, kind, level, correct, marks_awarded, marks_total, rating, answer, ms)
     values ($1, $2, $3, $4, 'mcq', 'recognize', $5, $6, 1, $7, $8, $9)`,
    [userId, blockId, lessonId, moduleId, correct, correct ? 1 : 0, correct ? 3 : 1, JSON.stringify({ choice }), Math.min(ms, 3_600_000)],
  );

  await pool.query(
    `insert into memory_state (user_id, block_id, stability, difficulty, due_at, reps, lapses, state, last_review)
     values ($1, $2, $3, $4, now() + $5::interval, 1, $6, $7, now())
     on conflict (user_id, block_id) do update
        set reps = memory_state.reps + 1,
            lapses = memory_state.lapses + case when $8 then 0 else 1 end,
            due_at = now() + $5::interval,
            state = case when $8 then 'review' else 'relearning' end,
            last_review = now(), updated_at = now()`,
    [userId, blockId, correct ? 3 : 1, correct ? 5 : 6, correct ? "3 days" : "10 hours", correct ? 0 : 1, correct ? "review" : "relearning", correct],
  );
}

/* ── stats ──────────────────────────────────────────────────────────────── */

export const DSE_DATE = new Date(Date.UTC(2027, 3, 8));

export async function getStats(userId: string) {
  const { rows } = await pool.query(
    `with mine as (select * from attempts where user_id = $1 and correct is not null),
          days as (select distinct (created_at at time zone 'Asia/Hong_Kong')::date as d from mine),
          today as (select (now() at time zone 'Asia/Hong_Kong')::date as d)
     select
       (select count(distinct block_id)::int from mine
         where (created_at at time zone 'Asia/Hong_Kong')::date = (select d from today)) as items_today,
       (select count(distinct block_id)::int from mine) as items_total,
       (select count(*)::int from blocks where kind = 'mcq') as items_all,
       (select count(*)::int from days d
         where d.d >= (select d from today) - 30) as active_days,
       (select count(distinct a.block_id)::int from attempts a
         where a.user_id = $1 and a.correct is false
           and not exists (
             select 1 from attempts b where b.user_id = $1 and b.block_id = a.block_id
              and b.correct is true and b.created_at > a.created_at)) as due_now`,
    [userId],
  );
  const r = rows[0] ?? {};

  /* streak: consecutive Hong Kong days ending today (or yesterday, before you've studied) */
  const { rows: dayRows } = await pool.query(
    `select distinct (created_at at time zone 'Asia/Hong_Kong')::date as d
       from attempts where user_id = $1 and correct is not null
       order by d desc limit 400`,
    [userId],
  );
  const daySet = new Set(dayRows.map((x: { d: Date | string }) => new Date(x.d).toISOString().slice(0, 10)));
  const hkToday = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  const shift = (iso: string, n: number) => {
    const d = new Date(iso + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  let streak = 0;
  let cursor = daySet.has(hkToday) ? hkToday : shift(hkToday, -1);
  while (daySet.has(cursor)) { streak++; cursor = shift(cursor, -1); }

  const daysToDse = Math.max(0, Math.floor((DSE_DATE.getTime() - Date.now()) / 86_400_000));

  return {
    itemsToday: Number(r.items_today ?? 0),
    covered: Number(r.items_total ?? 0),
    coverageTotal: Number(r.items_all ?? 0),
    dueToday: Number(r.due_now ?? 0),
    activeDays: Number(r.active_days ?? 0),
    streak,
    daysToDse,
  };
}

/* ── board ──────────────────────────────────────────────────────────────── */

export type BoardRow = { rank: number; name: string; items: number; you: boolean };

export async function getBoard(userId: string) {
  const { rows: cls } = await pool.query(
    `select c.id, c.name, c.module_id
       from enrollments e join classes c on c.id = e.class_id
      where e.student_id = $1 order by e.joined_at desc limit 1`,
    [userId],
  );
  const myClass = cls[0] ?? null;

  const { rows } = await pool.query(
    `with today as (select (now() at time zone 'Asia/Hong_Kong')::date as d),
          mine as (
            select a.user_id, u.name,
                   count(distinct a.block_id)::int as items,
                   max(a.created_at) as last_at
              from attempts a join users u on u.id = a.user_id
             where (a.created_at at time zone 'Asia/Hong_Kong')::date = (select d from today)
               and ($1::uuid is null or exists (
                     select 1 from enrollments e
                      where e.class_id = $1 and e.student_id = a.user_id))
             group by 1, 2
          )
     select user_id, name, items,
            row_number() over (order by items desc, last_at asc)::int as rank
       from mine order by rank limit 25`,
    [myClass?.id ?? null],
  );

  const rowsOut: BoardRow[] = rows.map((r) => ({
    rank: Number(r.rank),
    name: r.name,
    items: Number(r.items),
    you: r.user_id === userId,
  }));

  const { rows: present } = await pool.query(
    `select count(distinct a.user_id)::int as n
       from attempts a
      where (a.created_at at time zone 'Asia/Hong_Kong')::date = (now() at time zone 'Asia/Hong_Kong')::date`,
  );

  return { rows: rowsOut, className: myClass?.name ?? null, presentDay: Number(present[0]?.n ?? 0) };
}

/* ── classes ────────────────────────────────────────────────────────────── */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeCode(n = 6) {
  return Array.from({ length: n }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
}

export async function joinClass(studentId: string, raw: string) {
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const { rows } = await pool.query("select id, name from classes where join_code = $1", [code]);
  const cls = rows[0];
  if (!cls) return { ok: false as const, error: "No class with that code." };
  await pool.query(
    "insert into enrollments (class_id, student_id) values ($1, $2) on conflict do nothing",
    [cls.id, studentId],
  );
  return { ok: true as const, className: cls.name as string };
}

export async function myClass(studentId: string) {
  const { rows } = await pool.query(
    `select c.id, c.name, c.join_code, m.code as module_code, m.name as module_name
       from enrollments e join classes c on c.id = e.class_id
       left join modules m on m.id = c.module_id
      where e.student_id = $1 order by e.joined_at desc limit 1`,
    [studentId],
  );
  return rows[0] ?? null;
}

/* ── quickbits reads ────────────────────────────────────────────────────── */

export async function getReads(userId: string) {
  const { rows } = await pool.query(
    "select chapter, fragment from reads where user_id = $1",
    [userId],
  );
  return new Set(rows.map((r) => `${r.chapter}/${r.fragment}`));
}

export async function markRead(userId: string, chapter: string, fragment: string) {
  await pool.query(
    "insert into reads (user_id, chapter, fragment) values ($1, $2, $3) on conflict do nothing",
    [userId, chapter, fragment],
  );
}
