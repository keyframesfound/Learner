# DSE ICT bank — where the questions come from

`content/dse/<year>.json` holds the imported HKDSE ICT Paper 1 Section A questions,
and `scripts/import-dse.mjs` puts them in Postgres. Both are committed, so the bank can
be rebuilt from scratch and next year's paper can be added the same way.

## Source

Scan-only PDFs (past papers + marking scheme) supplied by the school. Nothing in them
is a text layer, so OCR is the only route in:

| file | what it gave |
|---|---|
| `<year>/p1.pdf` | the questions (Paper 1 Section A, 40 MCQs a year) |
| `<year>/ans.pdf` page 1-2 | the official key: question → A/B/C/D plus the % of candidates who chose the right answer |

Years with both halves present: **2020, 2022, 2023**. 2024 arrived in Chinese only, 2025's
zip has no Section A at all, and 2026 shipped Section B only — all three are parked until
the missing half turns up.

## Pipeline (`scripts/dse/`)

1. `extract.py <paper.pdf> <outdir>` renders each page at 170 dpi and asks a vision model
   for strict JSON per page (`inclusionai/ling-3.0-flash-vl` via OpenRouter — the large
   labs' models are region-blocked here). Section B pages return no questions, so the same
   run works on a full paper.
2. `merge.py <years…>` folds the pages into one record per question (a question that runs
   over a page break appears twice; the copy with four options and the longer stem wins),
   attaches the key letter, drops questions whose figure cannot survive plain text, and
   derives the difficulty from the candidate success rate: ≥70% `recognize` (Easy),
   45-69% `recall` (Medium), <45% `apply` (Hard).
3. `fixups.json` carries the handful of hand transcriptions (options printed inside a
   table come back in `code`, not `options`).
4. `node scripts/import-dse.mjs [year…]` upserts the module and lessons and replaces the
   lesson's blocks. `origin_hash = dse:<year>:<no>` makes a re-run idempotent.

## Known gaps

- 8 questions are picture-dependent (network diagrams, flowcharts, an ergonomics drawing)
  and were dropped rather than shown unanswerable.
- No explanations: the marking scheme gives the letter, not the reasoning. `payload.why`
  stays empty, so the player falls back to "Answer: C — <option>". The examiners' report
  (`per.pdf`) explains 27 of the 40 questions a year and is the material to mine next.
- Attribution: questions are HKEAA past-paper items, shown here for internal revision with
  the source printed under each item.
