#!/usr/bin/env node
/**
 * Import the junior-science revision bank from content/notes/<section>.json.
 *
 *   node scripts/import-notes.mjs               # every section found
 *   node scripts/import-notes.mjs 7.1 7.2       # just those
 *
 * One chapter module per textbook chapter (Ch 7, Ch 8) and one lesson per
 * section, so a student can drill "7.2 Photosynthesis" on its own instead of a
 * 50-question wall. Idempotent: blocks carry origin_hash `notes:<section>:<no>`
 * and are replaced per lesson, never duplicated.
 *
 * Source data: the school's junior science textbook, chapters 7 and 8 (student
 * edition PDFs → text → short MCQs; every answer carries a verbatim `quote`
 * from the chapter as its provenance).
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const TRACK = "science";
/* One module, twelve sections: the path has no module switcher, so splitting
   the chapters in two would have hidden Chapter 8 behind an unreachable URL. */
const MODULE = { id: "sci.junior", code: "SCI", name: "Junior Science · Ch 7–8" };
const OLD_MODULES = ["sci.ch7", "sci.ch8"];

function env(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const picked = process.argv.slice(2).filter((a) => /^\d\.\d$/.test(a));
const dir = path.join(process.cwd(), "content", "notes");
const files = fs
  .readdirSync(dir)
  .filter((f) => /^\d\.\d\.json$/.test(f))
  .filter((f) => (picked.length ? picked.includes(f.slice(0, 3)) : true))
  .sort();

if (!files.length) {
  console.error("no content/notes/<section>.json to import");
  process.exit(1);
}

const cfg = env(path.join(process.cwd(), ".env"));
const pool = new pg.Pool({ connectionString: cfg.DATABASE_URL });

/* the path row has one line for a title; the long chapter headings truncate */
const SHORT = {
  "7.6": "Balance in Nature",
};

const slugFor = (section, title) =>
  `sci-ch${section.replace(".", "-")}-` +
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

await pool.query(
  `insert into tracks (id, name, exam, accent, ord) values ($1,'Science','Junior','#0F7A35',1)
   on conflict (id) do update set name = excluded.name, accent = excluded.accent, ord = excluded.ord`,
  [TRACK],
);

await pool.query(
  `insert into modules (id, track_id, code, name, paper, compulsory, exam_weight, ord)
   values ($1,$2,$3,$4,1,true,0.15,1)
   on conflict (id) do update set name = excluded.name, code = excluded.code, ord = excluded.ord`,
  [MODULE.id, TRACK, MODULE.code, MODULE.name],
);
/* the earlier two-chapter layout is gone; drop it so lessons are not orphaned */
await pool.query("delete from modules where id = any($1::text[])", [OLD_MODULES]);

let total = 0;
for (const file of files) {
  const bank = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  const section = bank.section ?? file.slice(0, 3);
  const [ch, sec] = section.split(".").map(Number);
  /* 7.1 → 1 … 8.6 → 12, so the path reads like the book */
  const ord = (ch - 7) * 6 + sec;
  const qs = bank.questions ?? [];
  const slug = slugFor(section, bank.title ?? section);
  const title = `${section} ${SHORT[section] ?? bank.title ?? ""}`.trim();
  const summary = `${qs.length} short questions on ${bank.title ?? section} (Ch ${section}).`;
  const minutes = Math.max(3, Math.round(qs.length * 0.4));

  const { rows } = await pool.query(
    `insert into lessons (module_id, slug, title, summary, minutes, status, ord)
     values ($1,$2,$3,$4,$5,'published',$6)
     on conflict (module_id, slug) do update
        set title = excluded.title, summary = excluded.summary,
            minutes = excluded.minutes, status = 'published', ord = excluded.ord
     returning id`,
    [MODULE.id, slug, title, summary, minutes, ord],
  );
  const lessonId = rows[0].id;

  await pool.query("delete from blocks where lesson_id = $1 and origin_hash like 'notes:%'", [lessonId]);

  for (const [i, q] of qs.entries()) {
    const payload = {
      prompt: q.prompt,
      options: q.options.map((text) => ({ text })),
      answer: q.answer,
      why: q.why,
      source: `Junior Science · Ch ${section} ${bank.title ?? ""}`.trim(),
      /* the sentence the answer comes from — kept for the teacher portal */
      quote: q.quote,
    };
    await pool.query(
      `insert into blocks (lesson_id, kind, level, ord, marks, payload, origin_hash)
       values ($1,'mcq',$2,$3,1,$4,$5)`,
      [lessonId, q.level ?? "recall", i + 1, JSON.stringify(payload), `notes:${section}:${q.no ?? i + 1}`],
    );
  }
  total += qs.length;
  console.log(`${section}: ${qs.length} items -> ${slug} (${lessonId})`);
}

console.log(`imported ${total} items from ${files.length} section(s)`);
await pool.end();
