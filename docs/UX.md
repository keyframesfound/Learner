# UX

Direction: exam paper, printed in ink, with one electric accent.

The loop is borrowed from Duolingo because it is correct: one action per screen, an
immediate verdict, visible progression, and a single large button. Its surface is
not borrowed, because a green bevel, circular nodes on a curve, a mascot in a speech
bubble and an outlined PERFECT stamp together read as a clone. Variant B keeps the
loop and replaces the skin — printed rather than animated.

Brilliant's restraint was the other candidate and it is better typography than this,
but it disappears. A revision tool needs a spine that tells a student where they are
without them asking.

## Foundations

Colour. Paper, ink, one accent per subject, and lime reserved for success.

    paper    #F2EFE6      page
    ink      #111111      text, borders, primary fill
    ink-2    #4A4A45
    ink-3    #8C8A80      locked, muted, meta
    line     #D8D4C6      rules and rails
    lime     #D4FF3F      correct, streak, active tab
    orange   #FF4D1C      current step, drills
    blue     #2D5BFF      ICT accent, selection
    teal     #00C2B2      code tab
    gold     #FFC94A      me tab
    red      #FF3B30      wrong only

Semantic colour is fixed and never borrowed: lime means correct, red means wrong,
orange means "this is where you are". Subject identity lives in a line icon and its
stroke colour, never in a surface fill, so Biology green can coexist with a green tick
without either meaning the other.

Type.

    Archivo Black   display, question text, verdicts, numbers that shout
    Space Grotesk   UI, labels, body
    JetBrains Mono  code, counters, ranks, anything tabular

Question text is 27/1.16 with -.6px tracking. Body is 15. Meta is 12 mono, uppercase,
1.2px tracking.

Shape. 8px radius, 3px solid ink border, and a hard offset shadow — 5px 5px 0 for
cards, 6px 6px 0 for the device frame. No blur anywhere. Pressing translates the
element into its own shadow; the shadow never fades.

## Components

**Step row** (the path). A card, not a circle. Left: a numbered square, 34px, 3px
border. Middle: title plus a mono meta line. Right: a state glyph. Four states —
done (lime square, tick), current (inverted: ink fill, paper text, orange shadow),
locked (hatched background, half-opacity ink, no shadow). Vertical list connected by
a 3px rail, because a list is scannable and a curve is not.

**Segmented progress.** Fourteen 10px blocks with 2px ink borders, filled ones solid
ink. Reads as a mark sheet, not a thermometer.

**Option row.** Full width, 3px border, 4px offset shadow, letter chip A/B/C in a
26px square on the left. Selected fills blue with white text. Correct fills lime and
the letter chip inverts. Wrong fills red and the chip inverts — the letter never
moves, so the answer is still readable.

**Verdict band.** Not a sheet, not a stamp. A full-width band that grows from the
bottom of the screen: lime with ink text on correct, red with white text on wrong.
It carries the verdict word in Archivo Black, one line of why, and the button. No
floating badge, no confetti.

**Tab bar.** Four tabs: Learn, Drills, Board, Me. Each owns an accent — lime,
orange, blue, gold — in the Duolingo manner but in this skin: the active tab is a
3px-bordered pill sitting on the bar with a hard 3px ink shadow, tinted with its own
colour. Inactive tabs keep a transparent 3px border, so nothing shifts when selection
moves. Badges are red with an ink border, pinned to the pill's top-right.

There is no Code tab. A code playground is an ICT destination, not an app-wide one;
it lives inside the lessons that use it and is reachable from the module header. Any
tab that only makes sense for one subject does not belong in the global bar.

**Subject switcher.** A horizontal row of pills at the top of Learn, one per enrolled
subject. Each pill carries a 15px line icon drawn in that subject's colour:
a monitor for ICT, a bolt for Physics, a leaf for Biology, a conical flask for
Chemistry, and a blue globe with green landmasses for Geography. The active pill turns ink, the icon
flips to paper, and the subject colour moves to the pill's shadow. Subjects a student
does not take are absent rather than disabled.

Icons are printed stamps, not line art. Three primitives only:

    .s   solid shape: subject fill, 2px ink outline, round joins
    .o   ink detail laid on top: 2.2px stroke, no fill
    .l   land: solid green fill, no stroke, clipped to the globe it sits on

Every icon is drawn at 18px in a 24px viewBox with a 1.5px hard misregistered shadow
(drop-shadow, zero blur) so it sits in the same physical language as the cards. On the
active pill the shadow is dropped, outlines flip to paper, and cut-outs flip to ink, so
the icon survives an inverted background instead of dissolving into it.

Geometry is deliberately blocky and few-parted: three rectangles for the monitor, two
orbits and a dot for Physics, one shape plus one vein for Biology, one shape plus one
liquid line for Chemistry, one disc with three clipped landmasses for Geography.

**The icon must survive 18px.** That is the rule that decides geometry, and it is not
negotiable by aesthetic preference. Three candidates were drawn and rendered before
choosing:

- an orbital atom for Physics — three strokes crossing inside an 18px box fused into a
  scribble. Replaced by a bolt, which is one silhouette with no interior detail.
- a horseshoe magnet — at ribbon width the slot closes and it reads as the letter U.
- a projectile arc over a ground line — reads as a bridge.

Geography is a planet, not a ball. A disc carrying a latitude/longitude grid reads as a
sphere with stripes; a disc carrying irregular landmasses reads as the Earth. Land is
solid green on a blue sea, because blue-plus-green is the Earth code and teal-plus-paper
is not. Two masses, both clipped by the circle, both large enough to survive at 18px —
small continents read as specks.

**Code panel.** Inverted: ink background, paper text, lime keyword, peach numerals,
line numbers in #5A5A52. Code should look like a terminal, not like a thought
bubble.

## Screens

### Home

The landing screen after onboarding. Cross-subject by definition, so it carries no
subject filter — that belongs to Path. Four bands, top to bottom.

    ┌──────────────────────────────────────┐
│ DSE 2027 · 138 days  133 of 214 · 62% [♨ 12] │
├──────────────────────────────────────┤
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ ▤  Daily mix · 12 items      [Start]┃ │   ink band, orange shadow
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│ Drill                                │
│ ┌──┬───────────────────────────┬─────┐ │
│ │▤ │ ICT · 9 of 14 chapters    │Start│ │
│ └──┴───────────────────────────┴─────┘ │
│ ┌──┬───────────────────────────┬─────┐ │
│ │▤ │ Physics · 5 of 12         │Start│ │
│ └──┴───────────────────────────┴─────┘ │
│ QuickBits                            │
│ ┌──┬───────────────────────────┬─────┐ │
│ │▤ │ ICT · 15 notes · 3 read   │Study│ │
│ └──┴───────────────────────────┴─────┘ │
│ ┌──┬───────────────────────────┬─────┐ │
│ │▤ │ Physics · 9 notes · 2 read│Study│ │
│ └──┴───────────────────────────┴─────┘ │
├──────────────────────────────────────┤
│  [Learn]  [Drills]  [Board]  [Me]    │
└──────────────────────────────────────┘

**The header bar** carries three derived numbers, left to right: days to the first
written paper, syllabus coverage, current streak. None of them is a stored column.

- *Countdown* — `profile.dseYear`, captured once at onboarding after Google SSO
  ("which sitting are you in?"). The date comes from `dseStart(year)`; correct the
  constant when HKEAA publishes the timetable. Never edit rows.
- *Coverage* — items with at least one correct attempt, over items in the student's
  tracks. Cheap enough to compute on render; if it gets slow, materialise nightly.
- *Streak* — consecutive days with at least one graded attempt, in Asia/Hong_Kong.
  The badge is the only lime element on the screen, which is why it reads first.

**Drill** lists subjects, not classes. Start drills that subject's whole syllabus,
ordered by what is due, so the row carries progress and nothing else — a "next
chapter" label would promise a sequence the button does not deliver. Classes still
exist in the data, because a teacher owns a 4B; the student's home is organised by
syllabus because that is what the exam asks for.

**QuickBits** is the note stream, and like Drill it is entered per subject, so you
never browse a shelf of notes from three subjects at once.

Both sections use the same card anatomy on purpose — one visual language, one verb per
row (`Start` drills the subject, `Study` opens its notes). The accepted cost is that
with the same subjects in both lists the page reads as one list printed twice; an
index-style ledger for QuickBits was tried and rejected for looking too quiet beside
the drill cards.

### QuickBits

Three levels, each one screen, each scoped to the subject you came in through.

    ┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
│ ‹  ICT · QuickBits        30 notes   │        │ ‹  ICT · Computer hardware 3 of 6    │
├──────────────────────────────────────┤        ├──────────────────────────────────────┤
│ ┌──┬───────────────────────────┬─────┐ │        │ ┌──┬───────────────────────────┬─────┐ │
│ │01│ Variables and data types  │  ›  │ │        │ │01│ DDR4 vs DDR5 memory       │  ›  │ │
│ │  │ 3 of 6 read               │     │ │        │ └──┴───────────────────────────┴─────┘ │
│ └──┴───────────────────────────┴─────┘ │        │ ┌──┬───────────────────────────┬─────┐ │
│ ┌──┬───────────────────────────┬─────┐ │        │ │02│ CPU vs GPU                │  ✓  │ │
│ │04│ Computer hardware         │  ›  │ │        │ └──┴───────────────────────────┴─────┘ │
│ │  │ 3 of 6 read               │     │ │        ├──────────────────────────────────────┤
│ └──┴───────────────────────────┴─────┘ │        │  [Learn]  [Drills]  [Board]  [Me]    │
├──────────────────────────────────────┤        └──────────────────────────────────────┘
│  [Learn]  [Drills]  [Board]  [Me]    │
└──────────────────────────────────────┘

The third level is the note itself: one concept on one screen — `DDR4 vs DDR5
memory`, `CPU vs GPU`, "one variable and what a name means". Title in Archivo
Black, two or three short paragraphs, at most one comparison table or exam callout,
then `Mark as read` and the next fragment.

Rules that keep the level useful:

- A fragment answers **one** question. `DDR4 vs DDR5` is a fragment; "memory" is
  a chapter; "computer hardware" is the module above it.
- Nothing is scheduled. Reading never touches FSRS — Path owns scheduling, QuickBits
  owns the two-minute gap between lessons.
- Chapter rows state `3 of 6 read` rather than a count plus a count: one ratio, and
  it is the only number that says whether to open it.

### Path

    ┌──────────────────────────────────────┐
│ ICT · E2C            12 IN A ROW     │
├──────────────────────────────────────┤
│ ▮▮▮▮▮▯▯▯▯▯▯▯▯▯                       │
│ ┌──┬─────────────────────────┬─────┐ │
│ │01│ What a name is          │  ✓  │ │
│ └──┴─────────────────────────┴─────┘ │
│ ┌──┬─────────────────────────┬─────┐ │
│ │02│ Assignment and rebinding│  ✓  │ │
│ └──┴─────────────────────────┴─────┘ │
│ ┏━━┳━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━┓ │
│ ┃03┃ Valid identifiers       ┃  →  ┃ │
│ ┗━━┻━━━━━━━━━━━━━━━━━━━━━━━━━┻━━━━━┛ │
│ ┌──┬─────────────────────────┬─────┐ │
│ │04│ Types and conversion    │  🔒 │ │
│ └──┴─────────────────────────┴─────┘ │
├──────────────────────────────────────┤
│  [Path]  [Drills]  [Board]  ...      │
└──────────────────────────────────────┘

### Lesson

    ┌──────────────────────────────────────┐
│  ✕                        03 · 4 / 6 │
│  ┌ HARD ┐                            │
│                                      │
│  Which name is                       │
│  valid Python?                       │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 1  items = [1, 2, 3]           │  │
│  │ 2  print(items[2])             │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌──┐ ┌───────────────────────────┐  │
│  │A │ │ 2cool                     │  │
│  └──┘ └───────────────────────────┘  │
│  ┌──┐ ┌───────────────────────────┐  │
│  │B │ │ cool_2                    │  │
│  └──┘ └───────────────────────────┘  │
│                                      │
├──────────────────────────────────────┤
│ CORRECT                              │
│ cool_2 — starts with a letter.       │
│ [          CONTINUE                ] │
└──────────────────────────────────────┘

The band appears only after Check. Before that the button is disabled and grey, so
the screen has exactly one thing to do.

### Board

A podium, not a table. The top three stand on blocks of real height, first place in
lime, with the number set in Archivo Black. Below it, the student's own card is
inverted to ink with an orange shadow — orange already means "you are here" — and
carries a bar plus the line "6 items to pass Lam Ho Yin". That line is the point of
the page: a rank is a verdict, a gap is a task.

Only the top three and the student appear. A full list tells the bottom half of a
class that they are the bottom half, which is the opposite of what the leaderboard is
for. The header pill reads "14/18 showed up" — the honest measure of a class.

## Motion

- Press: translate 3px, 80 ms. The shadow does not move.
- Verdict band: grows from 0 to full height in 160 ms ease-out.
- Correct row: flips to lime instantly, no scale.
- Nothing bounces. A revision tool that bounces is exhausting.

## Mobile

Phone first. 44px minimum targets, thumb-reachable primary button, no hover-only
affordances. The code challenge runner opens as a full-height sheet with the Run
button floating over the editor.

## Tokens

Defined once as CSS custom properties and consumed semantically: paper, ink, ink-2,
ink-3, line, lime, orange, blue, teal, gold, red. No component hardcodes a hex.
