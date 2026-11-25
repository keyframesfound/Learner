# UX

Density over airiness. This is a revision tool used the week before a paper, not a
marketing site. Compact rows, small type steps, no illustration tax.

## Screens

| Route | Who | Job |
|---|---|---|
| / | both | pick a track |
| /t/[track] | student | modules + mastery heat strip |
| /t/[track]/[module] | student | lesson chain with rung badges |
| /t/[track]/[module]/[lesson] | student | the lesson player |
| /drills | student | mixed deck, due-first |
| /board | student | today's board |
| /playground | student | python + web sandbox |
| /mock | student | paper generator + timer |
| /me | student | mastery, streak, weak items |
| /teach | teacher | classes, coverage, alerts |
| /teach/classes/[id] | teacher | roster, assignments, item failures |
| /teach/curriculum | teacher | modules, lessons, publish state |
| /teach/builder/[id] | teacher | three-pane block editor |

## Lesson player

    ┌────────────── track · search · due 12 · streak 6 · avatar ──────────────────┐
│ ┌───────────┐ ┌─────────────────────────────────┐ ┌────────────────────────┐ │
│ │ ICT       │ │ E2C · Algorithm and Programming │ │  PYTHON                │ │
│ │ C1  ○     │ │ Lesson 3 of 12          4 min   │ │ ┌────────────────────┐ │ │
│ │ C2  ●     │ │                                 │ │ │ 1 items = [...]     │ │ │
│ │ C3  ◐     │ │ Q1  Which of these is a valid   │ │ │ 2 print(items[2])  │ │ │
│ │ C4  ▓▓    │ │     variable name?              │ │ └────────────────────┘ │ │
│ │ E2C ▓     │ │  ○ 2cool   ○ cool_2   ○ cool-2  │ │  ▶ Run   Reset         │ │
│ │           │ │                                 │ │  ───────────────────── │ │
│ │ lessons   │ │  [ Check ]                      │ │  c                      │ │
│ │ • Names   │ │                                 │ │                        │ │
│ │ • Values ●│ │  Tip: names may not start with  │ │                        │ │
│ │ • Loops   │ │  a digit.                       │ │                        │ │
│ │           │ │                                 │ │                        │ │
│ │ ▓▓▓░░░ 3/12│ │  [ Next → ]                     │ │                        │ │
└─┴───────────┴─┴─────────────────────────────────┴─┴────────────────────────┘

Scroll, do not paginate. Students skim notes and then practise, and a one-block-
at-a-time gate makes the reference use-case impossible. The only gate is the last
item of the lesson, which must be answered for the lesson to count as complete.

Feedback is inline, immediately under the item, never in a modal and never saved
for the end of the session.

## Daily board

    Today · 4B                              resets 00:00 HKT
┌──────────────────────────────────────────────────────────────┐
│ 1  Mei Lam          38 items   92%   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓     │
│ 2  Chan Ka Ho       35 items   71%   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓      │
│ 3  Wong Tsz Yan     31 items   84%   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓          │
│    ...                                                       │
│ 11 you              22 items   88%   ▓▓▓▓▓▓▓▓▓▓               │
└──────────────────────────────────────────────────────────────┘
    You moved up 3 places today.

Ranked by distinct items faced today, not by percentage. Accuracy sits in a
secondary column so it is visible without becoming the thing people optimise.
Ranking on volume means the student who most needs practice can win by showing up,
which is exactly the behaviour the platform is trying to create.

Students see the top three plus their own row. Teachers see the full table. The
closing line reports places moved, not points scored.

## Teacher builder

    ┌ Builder · E2C/L03 Names ──────── [Preview] [Save draft] [Publish] ───────┐
│ ┌ Blocks ──────┐ ┌ Canvas (student view) ─────────┐ ┌ Payload ───────────┐ │
│ │ ≡ prose      │ │  Q1  Which is a valid name?    │ │ kind: mcq           │ │
│ │ ≡ mcq    ✓   │ │  ○ 2cool  ○ cool_2  ○ cool-2   │ │ prompt: ...         │ │
│ │ ≡ fill   ✓   │ │                                │ │ options:            │ │
│ │ ≡ code       │ │  [ Check ]                     │ │  a) 2cool           │ │
│ │ ≡ challenge  │ │                                │ │     why: parser     │ │
│ │ + Add block  │ │  ⚠ 0 of 4 items minimum        │ │ answer: b           │ │
│ └──────────────┘ └────────────────────────────────┘ └─────────────────────┘ │
│ 4 items · 2 min · 1 concept                          autosaved 12 s ago     │

The canvas imports the same components the student page uses, so preview cannot
drift from production. Validation runs on every keystroke and shows the same
messages the importer would produce.

## Class results

    Class 4B · E2C     18 students · 12 assigned · 71% completion · 7-day retention 64%
┌ Struggling items ─────────────────────────────────────────────────────────┐
│ #  Lesson / item            Fail    Top wrong answer                       │
│ 1  L03 Q2  range()          14/18   "0,1,2,3,4"  - off-by-one on the stop  │
│ 2  L05 Q1  list index       11/17   "-1 is invalid" - negative indexing   │
│ 3  L07 Q4  while vs for      9/18   expects while to stop on its own       │
└────────────────────────────────────────────────────────────────────────────┘
Coverage   C1 ✓  C2 ✓  C3 ◐  C4 ▓  E2C ▓          Retention  64% (target 90%)

Ranked by item, with the wrong answer named. That is a lesson plan; an average
score is not.

## Design tokens

    bg        #0B0E14      surface   #12171F      border    #1E2633
    text      #E6EDF7      muted     #8A97AB      faint     #5A6678
    ict       #38BDF8      phy       #F59E0B
    ok        #34D399      bad       #F87171      warn      #FBBF24

    radius 10px · 1px borders · no gradients · no soft shadows
    type   12 / 13 / 15 / 17 / 22 / 28 / 40
    ui     Inter · code JetBrains Mono · formulas KaTeX
    rows   32px compact, 40px comfortable

Dark first with a light toggle. The track accent colours the rail and the heat
strip, never body text.

## Mobile

- The runner collapses into a bottom sheet with a drag handle; the editor is never
  more than one tap away.
- Code challenges get an insert bar (brackets, quotes, colon, indent) because a
  phone keyboard makes constructing code nearly impossible, and typing is where
  students quit.
- Tap targets 44px minimum. Fill-in-the-blank becomes tap-to-choose from a word
  bank on narrow screens: same item, lower motor cost.
- MCQ options stack full width; the sticky Check bar sits above the safe area.

## Empty and failure states

| State | Copy |
|---|---|
| nothing due | Nothing due. Next review in 2 days. Practise anyway? |
| no published lessons | This module has no published lessons yet. |
| runner loading | Preparing Python (about 10 MB, cached after the first time). |
| runner timeout | That took longer than 5 seconds. Infinite loop? |
| offline | You are offline. Your last 3 answers sync when you reconnect. |
| all mastered | Module mastered. Keep it warm with 5 items a week. |
