# DSE mapping

The curriculum tree is not decorative. It is the join key between content,
assessment weight, and teacher reporting. Every lesson carries a moduleId; every
attempt inherits it.

## ICT — HKDSE Information and Communication Technology

Verified against the HKEAA 2026 Regulations and Assessment Framework.
Sub-topic codes (the third level) are filled from the EDB Curriculum and
Assessment Guide at seed time.

Exam structure:

| Component | Weight | Duration | Format |
|---|---|---|---|
| Paper 1 Section A | 22% | — | 40 multiple-choice |
| Paper 1 Section B | 33% | 2 h total | short + structured |
| Paper 2 (any two electives) | 25% | 1 h 30 m | structured |
| School-based Assessment | 20% | — | portfolio / project |

Compulsory part (Paper 1):

| Code | Module |
|---|---|
| C1 | Information Processing |
| C2 | Computer System Fundamentals |
| C3 | Internet and its Applications |
| C4 | Basic Programming Concepts |
| C5 | Social Implications |

Elective part (Paper 2 — schools choose two):

| Code | Module | Runner |
|---|---|---|
| E2A | Databases (SQL, ER modelling, normalisation 1NF/2NF/3NF) | SQL (deferred) |
| E2B | Web Application Development (HTML, CSS, JavaScript) | iframe |
| E2C | Algorithm and Programming (Python) | Pyodide |

Note: E2B and E2C are both *inside* ICT. They are not separate tracks. A lesson
belongs to exactly one module; the runner is chosen by the block's lang, not by
the track.

## Physics — HKDSE Physics

Compulsory part:

| Code | Module |
|---|---|
| P1 | Heat and Gases |
| P2 | Force and Motion |
| P3 | Wave Motion |
| P4 | Electricity and Magnetism |
| P5 | Radioactivity and Nuclear Energy |

Elective part (schools typically teach one):

| Code | Module |
|---|---|
| E1 | Atomic World |
| E2 | Energy and Use of Energy |
| E3 | Astronomy and Space Science |
| E4 | Medical Physics |

## How the mapping earns its keep

**Mock paper generation.** Paper 1 Section A is 40 MCQs drawn from C1–C5. The
generator samples proportional to module weight, excludes blocks the student has
seen in the last 14 days, and writes a paper of 40 mcq blocks plus a timer of
120 minutes. Section B draws structured blocks totalling 33 marks. Zero new
content required — it is a SELECT with ORDER BY random() and a weight column.

**Coverage reporting.** A teacher sees, per class, how many published blocks in
each module have been attempted by at least one student. That is the difference
between "we finished the chapter" and "we finished the chapter".

**Weighted mastery.** A student's readiness for Paper 1 is not the average of
their lessons; it is weighted by exam share. ICT readiness = 0.22 x C1..C5 MCQ
accuracy + 0.33 x structured accuracy, with elective readiness reported
separately because it is only 25% and only two modules deep.

**Diagnosis.** Because attempts carry module_id and kind, "you are weak at
Physics" becomes "you lose marks on P4 numeric answers with units, not on the
concepts" — which is actionable in one lesson.
