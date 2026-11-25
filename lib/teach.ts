import { pool } from "./db";
import { makeCode, type Viewer } from "./repo";

/* every function here takes the viewer and enforces ownership itself:
   a teacher only ever touches their own classes and lessons. */

export async function teaches(v: Viewer, classId: string) {
  if (v.role === "admin") return true;
  const { rows } = await pool.query(
    "select 1 from classes where id = $1 and teacher_id = $2",
    [classId, v.id],
  );
  return rows.length > 0;
}

export async function ownLesson(v: Viewer, lessonId: string) {
  if (v.role === "admin") return true;
  const { rows } = await pool.query(
    `select 1 from lessons l
       join modules m on m.id = l.module_id
       join classes c on c.module_id = m.id
      where l.id = $1 and c.teacher_id = $2
      union
     select 1 from lessons l where l.id = $1 and $2::uuid is not null and exists (
       select 1 from classes c where c.teacher_id = $2 and c.module_id = l.module_id)
      limit 1`,
    [lessonId, v.id],
  );
  return rows.length > 0;
}

/* ── classes ───────────────────────────────────────────────────────────── */

export async function teacherClasses(v: Viewer) {
  const { rows } = await pool.query(
    `select c.id, c.name, c.join_code, c.module_id,
            m.code as module_code, m.name as module_name,
            (select count(*)::int from enrollments e where e.class_id = c.id) as students,
            c.created_at
       from classes c
       left join modules m on m.id = c.module_id
      where $1 = 'admin' or c.teacher_id = $2
      order by c.created_at desc`,
    [v.role, v.id],
  );
  return rows;
}

export async function createClass(v: Viewer, name: string, moduleId: string | null) {
  const clean = name.trim().slice(0, 40);
  if (!clean) return { ok: false as const, error: "Give the class a name." };
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = makeCode(6);
    try {
      const { rows } = await pool.query(
        `insert into classes (teacher_id, name, module_id, join_code)
         values ($1, $2, $3, $4) returning id, join_code`,
        [v.id, clean, moduleId, code],
      );
      return { ok: true as const, id: rows[0].id as string, code };
    } catch (e: unknown) {
      if (!String(e).includes("classes_join_code_key")) throw e;
    }
  }
  return { ok: false as const, error: "Could not allocate a code, try again." };
}

export async function updateClass(v: Viewer, id: string, patch: { name?: string; moduleId?: string | null }) {
  if (!(await teaches(v, id))) return false;
  await pool.query(
    `update classes set
        name = coalesce($3, name),
        module_id = case when $4::boolean then $5 else module_id end
      where id = $1 and ($2 = 'admin' or teacher_id = $2)`,
    [id, v.id, patch.name?.trim() || null, patch.moduleId !== undefined, patch.moduleId ?? null],
  );
  return true;
}

export async function deleteClass(v: Viewer, id: string) {
  if (!(await teaches(v, id))) return false;
  await pool.query("delete from classes where id = $1 and ($2 = 'admin' or teacher_id = $2)", [id, v.id]);
  return true;
}

export async function roster(v: Viewer, classId: string) {
  if (!(await teaches(v, classId))) return [];
  const { rows } = await pool.query(
    `select u.id, u.name, u.email,
            (select count(*)::int from attempts a
              where a.user_id = u.id
                and (a.created_at at time zone 'Asia/Hong_Kong')::date
                    = (now() at time zone 'Asia/Hong_Kong')::date) as items_today,
            (select count(*)::int from attempts a where a.user_id = u.id and a.correct is true) as correct_n,
            (select count(*)::int from attempts a where a.user_id = u.id and a.correct is not null) as graded_n
       from enrollments e join users u on u.id = e.student_id
      where e.class_id = $1
      order by items_today desc, u.name`,
    [classId],
  );
  return rows.map((r) => ({
    ...r,
    accuracy: Number(r.graded_n) ? Math.round((100 * Number(r.correct_n)) / Number(r.graded_n)) : null,
  }));
}

/** the items this class gets wrong, worst first */
export async function classFailures(v: Viewer, classId: string) {
  if (!(await teaches(v, classId))) return [];
  const { rows } = await pool.query(
    `select f.block_id, f.fail_pct, f.students_n, l.title as lesson,
            b.payload->>'prompt' as prompt
       from v_class_item_failures f
       join blocks b on b.id = f.block_id
       join lessons l on l.id = f.lesson_id
      where f.class_id = $1 and f.students_n > 0
      order by f.fail_pct desc nulls last, f.students_n desc
      limit 10`,
    [classId],
  );
  return rows;
}

/* ── curriculum ────────────────────────────────────────────────────────── */

export async function allModules() {
  const { rows } = await pool.query(
    `select m.id, m.code, m.name, t.name as track_name,
            (select count(*)::int from lessons l where l.module_id = m.id) as lessons
       from modules m join tracks t on t.id = m.track_id
      order by t.ord, m.ord`,
  );
  return rows;
}

export type LessonRow = {
  id: string; slug: string; title: string; summary: string;
  minutes: number; status: "draft" | "published" | "archived"; ord: number; blocks: number;
};

export async function lessonsOf(moduleId: string) {
  const { rows } = await pool.query(
    `select l.id, l.slug, l.title, l.summary, l.minutes, l.status, l.ord,
            (select count(*)::int from blocks b where b.lesson_id = l.id) as blocks
       from lessons l where l.module_id = $1 order by l.ord, l.created_at`,
    [moduleId],
  );
  return rows as LessonRow[];
}

export async function createLesson(v: Viewer, moduleId: string, input: { title: string; minutes?: number; summary?: string }) {
  const title = input.title.trim().slice(0, 80);
  if (title.length < 3) return { ok: false as const, error: "Title needs at least 3 characters." };
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48)
    || "lesson-" + Date.now().toString(36);
  const { rows } = await pool.query(
    `insert into lessons (module_id, slug, title, summary, minutes, concepts, status, ord)
     values ($1, $2, $3, $4, $5, array[$2], 'draft',
             coalesce((select max(ord) + 1 from lessons where module_id = $1), 1))
     on conflict (module_id, slug) do nothing
     returning id`,
    [moduleId, slug, title, (input.summary ?? "").slice(0, 200), Math.min(8, Math.max(2, input.minutes ?? 4))],
  );
  if (!rows[0]) return { ok: false as const, error: "A lesson with that title already exists." };
  return { ok: true as const, id: rows[0].id as string };
}

export async function updateLesson(id: string, patch: { title?: string; summary?: string; minutes?: number; status?: string; ord?: number }) {
  await pool.query(
    `update lessons set
        title = coalesce($2, title),
        summary = coalesce($3, summary),
        minutes = coalesce($4, minutes),
        status = coalesce($5::lesson_status, status),
        ord = coalesce($6, ord)
      where id = $1`,
    [id, patch.title?.trim() || null, patch.summary ?? null, patch.minutes ?? null, patch.status ?? null, patch.ord ?? null],
  );
}

export async function deleteLesson(id: string) {
  await pool.query("delete from lessons where id = $1", [id]);
}

export type BlockRow = {
  id: string; kind: string; ord: number; level: string | null; payload: Record<string, unknown>;
};

export async function blocksOf(lessonId: string) {
  const { rows } = await pool.query(
    "select id, kind, ord, level, payload from blocks where lesson_id = $1 order by ord, created_at",
    [lessonId],
  );
  return rows as BlockRow[];
}

export async function lessonById(id: string) {
  const { rows } = await pool.query(
    `select l.id, l.module_id, l.slug, l.title, l.summary, l.minutes, l.status, l.ord, m.name as module_name
       from lessons l join modules m on m.id = l.module_id where l.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function addBlock(lessonId: string, kind: "prose" | "mcq", payload: Record<string, unknown>) {
  const level = kind === "mcq" ? "recognize" : null;
  const { rows } = await pool.query(
    `insert into blocks (lesson_id, kind, level, ord, payload)
     values ($1, $2, $3::item_level,
             coalesce((select max(ord) + 1 from blocks where lesson_id = $1), 1), $4)
     returning id`,
    [lessonId, kind, level, JSON.stringify(payload)],
  );
  await pool.query("update lessons set updated_at = now() where id = $1", [lessonId]);
  return rows[0].id as string;
}

export async function updateBlock(id: string, payload: Record<string, unknown>) {
  await pool.query("update blocks set payload = $2 where id = $1", [id, JSON.stringify(payload)]);
}

export async function deleteBlock(id: string) {
  await pool.query("delete from blocks where id = $1", [id]);
}

export async function moveBlock(id: string, dir: -1 | 1) {
  const { rows } = await pool.query(
    "select id, lesson_id, ord from blocks where id = $1",
    [id],
  );
  const b = rows[0];
  if (!b) return;
  const { rows: neighbour } = await pool.query(
    `select id, ord from blocks
      where lesson_id = $1 and ord ${dir === -1 ? "<" : ">"} $2
      order by ord ${dir === -1 ? "desc" : "asc"} limit 1`,
    [b.lesson_id, b.ord],
  );
  if (!neighbour[0]) return;
  await pool.query("update blocks set ord = $2 where id = $1", [b.id, neighbour[0].ord]);
  await pool.query("update blocks set ord = $2 where id = $1", [neighbour[0].id, b.ord]);
}
