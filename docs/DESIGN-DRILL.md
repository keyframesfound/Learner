# Drill — design spec

Everything the drill surface does, in the order a student meets it.
Live demos: `design/demo2.html` (path, item), `design/boss.html` (raid).
Tokens and global rules live in `docs/UX.md`; this file only covers drill.

## 1. What this surface is for

Drill is where marks are made. The student arrives with a subject in mind and a
short amount of time, and leaves having produced answers — not having read about
producing them. Every screen here is a question, a choice, or a result.

Rules that follow from that:

- **One loud object per screen.** The live row, the live question, the live boss.
  Everything else is quiet chrome.
- **No reading before answering.** Instruction lives in the item itself, not in a
  paragraph above it.
- **Progress is always visible, never modal.** The student can see where they are
  without dismissing anything.

## 2. The four surfaces

| Surface | Route | Job |
|---|---|---|
| Path | `/drill` | Pick a chapter, see lesson state |
| Item | `/drill/[lesson]` | Answer one question, get a verdict |
| Raid lobby | `/drill/[chapter]/raid` | Form a party and start |
| Raid battle | same | Answer to damage the boss |
| Raid result | same | Close the loop, show what it cost |

## 3. Path

```
┌──────────────────────────────────────┐
│ [ICT] [Physics] [Biology] ...        │  subject chips, horizontal scroll
├──────────────────────────────────────┤
│ ICT · E2C              2 of 5 done   │  header: code, count, streak
├──────────────────────────────────────┤
│ ┌──┬──────────────────────┬────────┐ │
│ │01│ What a name is       │   ✓    │ │  done
│ └──┴──────────────────────┴────────┘ │
│ ┏──┳──────────────────────┳────────┓ │
│ ┃03┃ Valid identifiers     ┃   →    ┃ │  live
│ ┗──┻──────────────────────┻────────┘ │
│ ┌──┬──────────────────────┬────────┐ │
│ │04│ Types and conversion │ locked │ │  locked, hatched
│ └──┴──────────────────────┴────────┘ │
└──────────────────────────────────────┘
```

**Subject chips** — 3px ink border, 999px radius, 18px subject stamp inside.
Selected chip flips to ink fill with the subject's shadow colour. Horizontal scroll,
never wrap; the last chip may sit partly off-screen as a scroll affordance.

**Header** — three zones: module code left (`ICT · E2C`), progress centred
(`2 of 5 done`), streak badge right. The badge is the only lime element on screen.
Progress counts lessons **finished**, not items answered.

**Lesson row** is the page's unit. Anatomy:

| Part | Spec |
|---|---|
| Chip | 34px, 3px ink border, 6px radius, mono number |
| Title | 15px, weight 700, single line, ellipsis |
| Meta | 10.5px mono, ink-3, sentence case |
| Trailing | ✓ read, → live, nothing locked |

Three states, and only three:

- **Done** — white card, lime chip, ink ✓. Meta carries the familiarity label.
- **Live** — ink background, paper text, chip in orange, arrow. Shadow orange.
- **Locked** — hatched paper, muted text, no shadow, meta says what unlocks it
  (`Locked · finish 03`).

Locked rows are not tappable and do not use the hatching for anything else.
Hatching means *unavailable*, never *incomplete*.

## 4. Item

```
┌──────────────────────────────────────┐
│ ✕  ▮▮▮▮▮▮▮▮▯▯▯▯▯▯        03 · 4 / 6  │  chapter bar, item counter
├──────────────────────────────────────┤
│ [Hard]                               │
│ Which name is valid Python?          │  Archivo Black 27/1.16
│ ┌──────────────────────────────────┐ │
│ │ 1  items = [1, 2, 3]             │ │  ink code block, no border
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ A   2cool                        │ │
│ ├──────────────────────────────────┤ │
│ │ B   cool_2                       │ │  correct state: lime fill
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ Correct · struck once        [−1,000]│  verdict band, lime
│ cool_2 — starts with a letter.       │
│ [ Continue ]                          │
└──────────────────────────────────────┘
```

- **Chapter bar** — one notch per lesson in the chapter, lime fill. Sits between the
  close button and the counter. No number: the notches *are* the number.
- **Difficulty tag** — 2px border, mono, red for hard, orange for boss. Sentence case.
- **Options** — 3px ink border, 8px radius, 5px shadow. Correct fills lime and drops
  its shadow; wrong fills paper with a red border. Never both at once.
- **Verdict band** — lime on correct, ink on wrong. The verdict is a word
  (`Correct`, `Not quite`), never a score. Working is one line, always shown.

## 5. Raid

Three screens, one flow. The arena is **full-bleed** — no card, no border, the stage
runs to all four screen edges and the question sheet's top border is the ground line.

### Lobby
Boss preview card, party code in a bar of its own (`21px lime on ink, Copy button`),
four slots in a 2×2 grid — filled slots solid, empty slots dashed. Start is disabled
until two are ready.

### Battle
```
┌──────────────────────────────────────┐
│ ✕        Raid · E2C          07:42   │
│        ┌ Mr. Cheung  Lv 3 ┐          │  enemy plate, floating
│        │ ▮▮▮▮▮▮▮▮▯▯▯▯     │          │
│        └──────────────────┘          │
│             [ boss ]                 │  40×52 grid, 3× scale
│          ╱  burst  ╲                 │
│   ┌ Kai ┐  ┌ Mei ┐  ┌ You ┐  ┌ Jon ┐ │  party, back view
│   │ ▮▮▯▯│  │ ▮▮▮│  │ ▮▮▮▮│  │ ▮▮▮│  │  own plate per member
└──────────────────────────────────────┘
```

- **Boss dominates.** Roughly 2× party height, standing on a platform, above them.
- **Party is in back view.** No faces — the camera is behind them. That single
  choice is what makes the composition read as *us against him*.
- **Every member carries a nameplate**: name in Silkscreen 6.5px, six pips. Without
  per-member plates it reads as a queue, not a raid.
- **One answer = one strike.** Twelve items × 1,000 HP = the bar. The arithmetic is
  shown, not implied.
- **The strike** is a flat lime burst behind the boss plus an arc from the party.
  The burst never covers the sprite; if it hides who you hit, it has failed.

### Result
Boss lies rotated on his platform, bars empty, sheet becomes a result card:
course cleared, damage dealt, your share, accuracy, party size. One button out.

## 6. Familiarity labels

The rung ladder (recognise → recall → apply → construct) is internal. On screen the
lesson carries one word describing **how the answer comes out**:

| Label | Colour | Means |
|---|---|---|
| Cold | `#6E6C63` | never attempted |
| Rough | `#C4271B` | it comes out, with gaps |
| Smooth | `#2D5BFF` | it comes out |
| Fluent | `#0F7A35` | it comes out without thinking |

Colour sits on the word, not on a dot, and the shades are picked to clear 4.5:1 on
paper — which is why Fluent is `#0F7A35` and not the brand green `#17A34A`.

## 7. Copy rules

- **Sentence case everywhere.** No caps except the 8.5px tab labels, where lowercase
  is illegible.
- **No scores in the drill UI.** `Correct`, not `+1`; `2 of 5 done`, not `40%`.
- **Counts read as ratios** where the ratio is what you act on: `3 of 6 read`,
  never `6 notes · 3 read`.
- **Locked rows say what unlocks them.** `Locked · finish 03` beats `Locked`.

## 8. Motion

The demo is static; the build should not be.

| Event | Motion | Duration |
|---|---|---|
| Option tap | shadow collapses, row drops 3px | 70ms |
| Correct | band slides up from the bottom | 140ms |
| Wrong | option shakes ±3px, two cycles | 180ms |
| Boss hit | boss shifts 4px, shadow shifts opposite | 120ms |
| Burst | scales 0.7 → 1, fades after 400ms | 260ms |
| Lesson unlock | hatch dissolves to white | 200ms |

Nothing eases for longer than 260ms. Anything slower reads as lag on a school phone.

## 9. Never

- Never stack two accents on one screen. Lime *or* orange, not both, except in raid
  where orange is the boss and therefore means *not you*.
- Never put the answer in the meta line. `Valid identifiers · 6 items` is fine;
  `Valid identifiers · the one about underscores` is a spoiler.
- Never show a percentage where a count would do. Percentages are for the header,
  where they summarise everything.
- Never animate the item counter. It is reference, not feedback.
- Never let hatching mean two things. It means locked, always.

## 10. Open

- Chapter bar: continuous or notched, unresolved in the build.
- Raid victory: no animation between the last hit and the result sheet.
- Party sprites: Mei's bun and Jon's long hair are legible on inspection, not at a
  glance. Bolder silhouettes would fix it.
