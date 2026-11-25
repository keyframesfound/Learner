# Architecture

## 1. Purpose and non-goals

**Purpose.** Give a DSE student a place to read a concept once, practise it until
it sticks, and see honestly where they are weak — and give a teacher the evidence
to reteach the right thing on Monday.

**Non-goals.** Not a general-purpose LMS. Not a course marketplace. Not a
server-side code judge. Not multi-tenant SaaS — one deployment, one school.

## 2. The four concepts

    Track (subject)      ICT | Physics
      Module             C1..C5, E2A..E2C | P1..P5, E1..E4     (syllabusRef)
        Lesson           5-8 min, one concept, ends with a win
          Block          prose | mcq | fill | numeric | challenge | ...

Everything else — the student page, the builder, the grader, the importer, the
analytics — is a view over these four levels. If a feature cannot be expressed as
a projection of this tree plus the attempts table, it belongs in a different schema.

## 3. Runtimes

Code never runs on the server. That is the central security and cost decision.

| Runtime | Used for | Mechanism | Limits |
|---|---|---|---|
| Python | ICT C4, E2C | Pyodide in a Web Worker, interrupt buffer as a watchdog | 5 s CPU, ~10 MB WASM on first load, no blocking input() |
| Web | ICT E2B | iframe with sandbox="allow-scripts allow-modals", srcDoc, debounced 500 ms | no same-origin, so no DOM access from the app — results come back by postMessage |
| SQL | ICT E2A (deferred) | PGlite (Postgres in WASM) seeded with the exercise schema | not built until E2A is confirmed in scope |
| None | Physics prose, formulas | server-rendered markdown + KaTeX | — |

Consequences that must be designed for, not discovered later:

- Python exercises are print-based or assertion-based. stdin is supplied as a
  pre-filled buffer that a patched input() reads from, one line at a time.
- The iframe cannot be inspected by the parent. The runner injects a console shim
  and an error handler that postMessage structured results back.
- Pyodide is loaded from a CDN on first use, behind a visible loading state, and
  cached by the browser. It is never bundled into the app image.

## 4. Grading contract

One pure function, no I/O:

    grade(block, answer) -> { correct: boolean | null, awarded, total, feedback[] }

- **Client-side grading is advisory.** It exists for instant feedback only.
- **Server-side grading is authoritative.** The API re-grades every submission
  from the stored block payload before writing the attempt row. A tampered client
  can lie about its local score; it cannot lie about the database.
- Structured questions return correct = null and awarded from self-marking or
  teacher marking. They are never counted in auto-graded accuracy.

Partial credit exists only where marks exist: fill (per blank), challenge (per
test, weighted, with hidden tests), structured (per part).

## 5. Data model

    users ──┬── sessions
            ├── enrollments ── classes ── teacher (users)
            └── attempts ── blocks ── lessons ── modules ── tracks

    attempts(id, user_id, block_id, lesson_id, module_id, kind,
             correct, marks_awarded, marks_total, answer jsonb, ms, created_at)

attempts denormalises lesson_id and module_id on purpose: every dashboard query
is a filter on module or time, and a three-way join on each of them is the
difference between a 4 ms and a 400 ms page on a small VM.

Derived, never stored:
- mastery per student per module = accuracy over the last 20 graded attempts
- class failure rate per block = failures / attempts among enrolled students
- syllabus coverage = distinct blocks attempted / blocks published, per module
- stuck point = attempts before first correct on a block

All four are SQL views. See db/schema.sql.

## 6. Routes

Student

    /                              pick track
    /t/[track]                     modules + progress heat strip
    /t/[track]/[module]            lesson list
    /t/[track]/[module]/[lesson]   lesson player
    /drills                        spaced-repetition deck, filtered by module
    /playground                    python | web sandbox
    /mock                          mock paper generator + timer
    /me                            mastery, streak, weak topics

Teacher

    /teach                         overview: classes, coverage, alerts
    /teach/classes/[id]            roster, assignments, results
    /teach/curriculum              modules, lessons, publish state
    /teach/builder/[lessonId]      three-pane block editor
    /teach/mock/[paperId]          paper assembly

API

    POST /api/attempts             grade + persist (rate limited)
    CRUD /api/teach/lessons        authoring
    CRUD /api/teach/classes
    POST /api/auth/*               sign in, sign up, join class

## 7. Auth and roles

Better Auth, email + password, sessions in Postgres, httpOnly + SameSite=Lax
cookies, argon2id hashing. Roles: student, teacher, admin.

Students join a class with a 6-character code, or are bulk-imported by a teacher
from CSV (schools prefer handing out credentials to self-registration). A teacher
can only read attempts joined through enrollments in a class they own — enforced
in the query layer, not only in the UI.

## 8. Deployment

One VM, Ubuntu 24.04, 2 vCPU / 4 GB, Docker Compose:

    Caddy (443, auto-TLS)  ->  learner (Next standalone, node:22-alpine)  ->  postgres:16

Sizing: Postgres with shared_buffers 256 MB, max_connections 100, and 200
concurrent students is comfortable at 4 GB. Next runs one Node process; lesson
pages are cached and revalidated on publish rather than rendered per request.

Backups: nightly pg_dump to a mounted volume, 7-day rotation, plus a weekly copy
off the box. Content is never hostage to the database — make export writes the
lesson tree back to /content as JSON.

## 9. Security posture

- Teacher-written content is data, never code. Nothing from payloads is eval'd.
- iframe runner: no allow-same-origin. Python: WASM sandbox, interrupt watchdog.
- CSP on the app; Pyodide origin allowlisted explicitly.
- Server re-grades. Attempts endpoint rate limited to 60/min/user.
- Session rotation on login; no long-lived tokens in localStorage.

## 10. Performance budget

- Lesson route: < 120 KB JS before the runner; runner is a separate dynamic import.
- Pyodide: never on first paint. Loaded when a python block first becomes visible.
- Health strip and mastery rings render from one cached query per page.
- No web fonts above 2 families; icons are inline SVG.

## 11. Build order

**Foundation** (must be first)
Zod contracts, block components, grader, DB schema, auth shell. No visuals.

**Then two shells in parallel, sharing components/blocks**
Student lesson player (Track A) and teacher builder (Track B). The builder's
canvas imports the same block components, so preview is not a second renderer.

**Then two surfaces in parallel, sharing attempts**
Drills deck (student) and results/coverage dashboard (teacher). Both are
read-only projections of the same views.

**Then depth**
Bilingual content (schema already supports it if we add locale keys), DSE past
paper bank, mock paper generator, PWA offline.
