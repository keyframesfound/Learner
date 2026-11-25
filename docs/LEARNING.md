# Learning design

You cannot make memory *unconscious*. You can make retrieval *automatic* — fast,
effortless, available under exam pressure. That is what this document specifies,
and it is why the platform is built out of tiny items rather than chapters.

The uncomfortable finding from the research: the techniques that feel most like
learning (re-reading, highlighting, watching) produce the least retention, and the
techniques that feel least like learning (being tested, forgetting, being mixed up)
produce the most. Every decision below trades a worse feeling now for a better
result in June.

## 1. The atom is the item, not the lesson

One item = one retrieval event = one memory trace with its own schedule.

    item := a prompt, an answer, a misconception to correct, one concept

Consequences:
- Spacing is per item. Two items from the same lesson can be due on different days.
- Analytics are per item. "The class fails this question" is meaningful; "the class
  struggled with this lesson" is not.
- A lesson is a sequence of first exposures, nothing more. It never owns an item.

## 2. The chunk ladder

Every item has a rung. You move up only when the rung below is fluent.

| Rung | Kind | Ask | Cost | Retention value |
|---|---|---|---|---|
| 1 Recognize | mcq | pick the right one | 5 s | low |
| 2 Recall | fill | produce it from memory | 15 s | high |
| 3 Apply | predict, numeric | use it on new input | 30 s | high |
| 4 Construct | challenge, structured | write it | 2-5 min | highest, slowest |

Rules:
- Never introduce a concept at rung 4. Nobody constructs what they cannot recall.
- Never let a concept live only at rung 1. MCQ alone produces recognition, and
  recognition is what fails in an exam hall.
- Every concept reaches rung 2 before it is considered taught.
- Rungs 3-4 are where DSE marks live — Paper 1 Section B and Paper 2 are construct
  tasks. But they are the reward, not the entry point.

## 3. The lesson template (productive failure)

Generated failure beats clean explanation. The standard shape of every lesson:

    1. PRETEST    one item the student cannot yet answer      30 s
    2. NOTE       maximum 120 words, only what the gap needs  60 s
    3. RETEST     the same item, now answerable               15 s
    4. VARIANT    a different item, same concept              30 s
    5. APPLY      one rung-3 item                             45 s

Total: 3-4 minutes, 5 items, one concept. The pretest is deliberately
unanswerable — the wrong guess creates the gap the note fills, and the gap is what
makes the note stick. Students report this as confusing for the first two lessons
and then prefer it.

Hard limits, enforced by the schema:
- prose blocks capped at 120 words
- no more than one prose block before an item
- 4-8 items per lesson, never more
- one concept per item

## 4. The session engine

A session is a mixed deck, not a lesson. 10-15 items, 5-7 minutes.

Composition per session:
- 5-8 due reviews (items whose schedule has come up), oldest first
- 5-8 new items, drawn from the current module in the lesson's own order
- 0-4 weak items (recent lapses from other modules)

Scheduling is FSRS (Free Spaced Repetition Scheduler — the algorithm Anki adopted
in 2023), in lib/scheduler.ts, wrapping the maintained ts-fsrs package with population
default weights. Per-user
weight optimisation is a later refinement; do not build it now.

Per item we store memory state:

    stability   S    days until recall probability decays to 90%
    difficulty  D    1..10, how hard this item is for this student
    due_at           next review time
    reps, lapses
    state            new | learning | review | relearning

Rating is derived from telemetry, not from asking the student how they feel:

| Observation | FSRS rating |
|---|---|
| wrong, or used a hint | Again |
| correct, over the expected time | Hard |
| correct, normal time | Good |
| correct, far under expected time, no hints | Easy |

Desired retention: **0.90** by default. That number is the entire tuning knob.
Lower (0.80) means fewer reviews and more forgetting; higher (0.95) means more
reviews and better exam readiness. Expose it per class as an exam-mode switch that
pushes students to 0.95 in the six weeks before the paper.

## 5. Interleaving — with the one exception

Blocked practice (all of one type, then all of another) feels better and tests
worse. Interleaved practice feels worse and tests better. So:

- **First exposure**: blocked. Teach variables with variables. Interleaving a
  concept the student has never met is just noise.
- **Review**: interleaved across modules, always. A session should contain items
  from at least two modules once the student has two.

The rule in one line: block the teaching, interleave the testing.

## 6. Feedback rules

- Immediate. Never batch feedback to the end of a session.
- Corrective, not evaluative: say what the right answer is and why the wrong one
  was attractive. This is why every distractor requires a misconception string.
- Never shame. Wrong answers are the mechanism, and the UI must not punish them.
- For constructs: show the failing test name and expected vs actual output, never
  a diff of their code against the solution.

## 7. Mastery and graduation

An item graduates from the lesson deck to the review deck after **2 consecutive
correct answers on separate days**. It returns to the lesson deck if it lapses twice.

A concept is mastered at 90% accuracy over its last 10 graded attempts with a
stability of at least 14 days. Nothing else counts as mastered — not lessons
opened, not videos watched.

**Leeches.** An item failed 8 times is not a spacing problem, it is a prerequisite
problem. The engine demotes it: serve the item one rung lower and surface its
requires[] concepts as new items. This is the highest-value automation in the
system, because the platform fixes its own content gaps.

## 8. Motivation without corrupting the signal

Streaks, rings and levels are fine. Coins, loot and leaderboards are not: they make
students optimise the reward instead of the retrieval, and the moment the reward
stops the behaviour stops.

Rules:
- A streak counts days with a completed session, not days with a right answer.
  Never break a streak on a wrong answer — that punishes desirable difficulty.
- The only numbers shown prominently are mastery and due-today. Both are honest.
- A daily board is allowed, but it ranks **distinct items faced today**, never
  accuracy or score. Volume can be won by anyone who shows up; accuracy ranking
  rewards the students who are already ahead and demoralises the ones who are not.
  Students see the top three plus their own rank, never a public list of the bottom.
  Teachers can switch it off per class.

## 9. What the teacher sees, and why

| Metric | Definition | What it means |
|---|---|---|
| First-attempt accuracy | correct on first ever attempt, per item | teaching quality, not student ability |
| Lapse rate | reviews answered Again / all reviews | retention failure |
| 7-day retention | % of day-0-correct items still correct at day 7+ | the only honest number |
| Coverage | published items attempted / published | did we finish the syllabus |
| Time to mastery | days from first exposure to mastered | pace vs the exam date |

Ranked by item, not by lesson. "14 of 18 students guessed 0,1,2,3,4 on range(5)" is
a lesson plan for tomorrow. "Average lesson score 62%" is not.

## 10. Banned patterns

- MCQ with "all of the above", "none of the above", or joke distractors
- options that differ only in wording rather than in the misconception they encode
- showing the answer before an attempt
- more than 120 words of prose before an item
- re-asking the identical item within one session (masks retention, inflates stats)
- items with two concepts
- a construct-rung item as a student's first encounter with a concept
- any progress bar that increments on scrolling rather than on answering
