#!/usr/bin/env node
/**
 * Import the HKDSE ICT Paper 1 Section A bank from content/dse/<year>.json.
 *
 *   node scripts/import-dse.mjs            # every year found
 *   node scripts/import-dse.mjs 2020       # just one
 *
 * Idempotent: each question carries origin_hash `dse:<year>:<no>`, and the lesson's
 * previous blocks with that prefix are removed before the new set is inserted, so a
 * re-run after a fixup replaces rather than duplicates. Lessons and the module are
 * upserted, so re-running after adding a year leaves the rest alone.
 *
 * Source data: HKDSE ICT Paper 1 Section A question papers and the HKEAA marking
 * scheme answer key, transcribed from the scanned PDFs (see docs/dse-import.md).
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const TRACK = "ict";
const MODULE = "ict.p1a";
const HASH = "dse:";

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

const years = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a));
const dir = path.join(process.cwd(), "content", "dse");
const files = fs
  .readdirSync(dir)
  .filter((f) => /^\d{4}\.json$/.test(f))
  .filter((f) => (years.length ? years.includes(f.slice(0, 4)) : true))
  .sort();

if (!files.length) {
  console.error("no content/dse/<year>.json to import");
  process.exit(1);
}

const cfg = env(path.join(process.cwd(), ".env"));
const pool = new pg.Pool({ connectionString: cfg.DATABASE_URL });

const minutesFor = (n) => Math.max(3, Math.round(n * 0.35));

await pool.query(
  `insert into tracks (id, name, exam, accent, ord) values ($1,'ICT','HKDSE','#2D5BFF',0)
   on conflict (id) do nothing`,
  [TRACK],
);

await pool.query(
  `insert into modules (id, track_id, code, name, paper, compulsory, exam_weight, ord)
   values ($1,$2,'P1A','Paper 1 · Section A',1,true,0.35,1)
   on conflict (id) do update set name = excluded.name, paper = excluded.paper, ord = excluded.ord`,
  [MODULE, TRACK],
);

/**
 * The same paper, drilled in short form. content/dse-short/<year>.json holds a
 * rewritten question per exam item (5-14 words, four short options); the exam
 * wording stays in content/dse/ and rides along in the payload as `exam` so the
 * teacher portal can still show the paper as printed. Items the rewrite had to
 * skip (printed diagram, algorithm listing) are not inserted at all.
 */
const shortDir = path.join(process.cwd(), "content", "dse-short");
const readShort = (year) => {
  const file = path.join(shortDir, `${year}.json`);
  if (!fs.existsSync(file)) return new Map();
  const bank = JSON.parse(fs.readFileSync(file, "utf8"));
  return new Map((bank.items ?? []).filter((i) => !i.skip).map((i) => [String(i.no), i]));
};

let total = 0;
for (const [idx, file] of files.entries()) {
  const year = file.slice(0, 4);
  const bank = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  const short = readShort(year);
  const qs = (bank.questions ?? []).filter((q) => short.size === 0 || short.has(String(q.no)));
  const slug = `dse-${year}-p1a`;
  const title = `${year} Paper 1A`;
  const summary = `${qs.length} short multiple-choice questions from the ${year} HKDSE ICT Paper 1 Section A.`;
  const minutes = minutesFor(qs.length);

  const { rows } = await pool.query(
    `insert into lessons (module_id, slug, title, summary, minutes, status, ord)
     values ($1,$2,$3,$4,$5,'published',$6)
     on conflict (module_id, slug) do update
        set title = excluded.title, summary = excluded.summary,
            minutes = excluded.minutes, status = 'published', ord = excluded.ord
     returning id`,
    [MODULE, slug, title, summary, minutes, idx + 1],
  );
  const lessonId = rows[0].id;

  await pool.query("delete from blocks where lesson_id = $1 and origin_hash like $2", [
    lessonId,
    HASH + year + ":%",
  ]);

  for (const [i, q] of qs.entries()) {
    const brief = short.get(String(q.no));
    const asked = brief ?? q;
    const payload = {
      prompt: asked.prompt,
      options: asked.options.map((text) => ({ text })),
      answer: asked.answer,
      why: asked.why ?? q.why,
      source: q.source,
      ...(brief ? { exam: q.prompt } : {}),
      ...(!brief && q.code && q.code.length ? { code: q.code } : {}),
    };
    await pool.query(
      `insert into blocks (lesson_id, kind, level, ord, marks, payload, origin_hash)
       values ($1,'mcq',$2,$3,1,$4,$5)`,
      [lessonId, q.level, i + 1, JSON.stringify(payload), `dse:${year}:${q.no}`],
    );
  }
  total += qs.length;
  console.log(`${year}: ${qs.length} items -> lesson ${slug} (${lessonId})`);
}

console.log(`imported ${total} items from ${files.length} paper(s)`);
await pool.end();
