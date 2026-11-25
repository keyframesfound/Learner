# Learner

An interactive DSE learning platform. Ships with **ICT** and **Physics**, and any
other elective is a seed file rather than a code change.

Notes → inline checks → live code runners → teacher analytics. Built around the
HKEAA assessment structure rather than around a language list, so a mock paper is
a query and syllabus coverage is a dashboard.

## What it does

- **Lessons** are 5–8 minute fragments: prose, callouts, runnable code, MCQs,
  fill-in-the-blanks, predict-the-output, and code challenges — all auto-graded.
- **Runners** execute in the browser: Python via Pyodide (Web Worker), HTML/CSS/JS
  via a sandboxed iframe. No server-side code execution, no queue, no container
  escape surface, no compute bill.
- **Teacher dashboard** builds lessons with the same block components the student
  sees, assigns to classes, and reports *which question the class failed and why*.
- **Attempts** are the spine. One table drives mastery, stuck points, class
  failure rates, syllabus coverage and mock-paper readiness.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · CodeMirror 6 · KaTeX ·
PostgreSQL 16 · Drizzle · Better Auth · Caddy · Docker Compose · Vercel-optional.

## Docs

| File | Contents |
|---|---|
| docs/ARCHITECTURE.md | System design, grading contract, data flow, deployment, build order |
| docs/CONTENT-MODEL.md | Every block type, its JSON, its marking rule, and the notes importer spec |
| docs/DSE-MAPPING.md | Syllabus tree and how it drives mock papers and coverage |
| docs/UX.md | Screen inventory, wireframes, design tokens, mobile behaviour |
| db/schema.sql | The database, with the analytics views |
| lib/schema.ts | Zod contracts — the single source of truth |

## Local development

    cp .env.example .env
    docker compose up -d db
    npm install
    npm run db:push
    npm run seed
    npm run dev

## Deploy (own VM)

    make deploy     # caddy + app + postgres on one box
    make dump       # nightly pg_dump, 7-day rotation

## Licence

MIT
