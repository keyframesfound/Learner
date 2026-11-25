# UX

Direction: Duolingo's visual language, adapted for code and physics.

Duolingo is the reference because it solved the exact problem this product has —
getting a teenager to do five minutes of retrieval practice every day without being
told to. Its design is not decoration; it is the reward loop made visible. So we take
the whole language: light background, thick outlines, 3D pressable buttons, a winding
path, a mascot, big stamps on success, and a green continue bar.

What we do not take: hearts, XP, and leagues. Those punish wrong answers and rank
children against each other, which is the opposite of what the learning model needs.
(Wrong answers are the mechanism. You cannot punish the mechanism.)

## Foundations

Colour. One accent per subject, everything else neutral.

    ink        #3C3C3C      primary text
    ink-muted  #777777      secondary text
    ink-faint  #AFAFAF      disabled, locked
    line       #E5E5E5      2px borders everywhere
    bg         #FFFFFF
    bg-alt     #F7F7F7      sheet background, input wells

    green      #58CC02      primary action, correct
    green-dk   #4CAD00      the 4px bottom edge that makes buttons physical
    green-pale #D7FFB8      correct banner background
    blue       #1CB0F6      ICT accent, links
    blue-dk    #1899D6
    purple     #CE82FF      Physics accent
    purple-dk  #A568CC
    gold       #FFC800      streak, legendary nodes
    gold-dk    #E5A700
    red        #FF4B4B      wrong answer only - never used for UI chrome
    red-dk     #EA2B2B
    red-pale   #FFDFE0

Type. Nunito 800/900, fallback system-ui. Rounded terminals are doing real work:
they read as friendly at 15px, which is where the body copy lives. Code is
JetBrains Mono, 13px, never bold.

    40/900  screen titles, stamps
    24/900  lesson prompt
    17/800  buttons and answer text
    15/700  body
    12/800  uppercase chips, letter-spacing .8px

Shape. Radius 16 on cards and buttons, 20 on sheets, 999 on chips and nodes.
Nothing is square and nothing is a subtle 4px radius — that is the difference
between this and a generic dashboard.

Elevation is never a blur. It is a solid offset: box-shadow 0 4px 0 shade, and the
element translates down 4px on press. That single rule carries most of the feel.

## Components

**Button.** Full width by default, 52px tall, 16px radius, uppercase 15/800 label
with .8px tracking, white text, green fill, 4px darker-green bottom edge. Pressed:
translateY(4px) and the edge collapses to 0. Disabled: #E5E5E5 fill, #AFAFAF label,
no edge, no shadow.

**Card.** White, 2px #E5E5E5 border, 16px radius, shadow 0 2px 0 #E5E5E5. Selected
or correct: 2px green border plus green-pale fill.

**Path node.** 72px circle. Four states:
- locked — #E5E5E5 fill, #AFAFAF icon, no shadow
- available — subject accent, 6px darker bottom rim, white icon
- current — accent plus a soft pulsing halo and a bouncing START tag above it
- complete — accent with a white check, gold star if done with no hints

Nodes sit on a dashed winding path drawn as SVG, alternating left and centre so the
eye zig-zags down the screen the way Duolingo does.

**Progress bar.** 16px tall, #E5E5E5 track, rounded ends, green fill with a lighter
30%-white highlight strip across the top half. Sits at the top of the lesson player
with the streak counter floating above it.

**Chip.** Small uppercase pill. HARD EXERCISE uses red-pale fill with red text;
NEW CONCEPT uses purple-pale with purple text.

**Stamp.** PERFECT or NICE! in 40/900, white fill, 4px coloured stroke, rotated -8deg,
scales in over the answer area and fades after 900 ms. This is the whole reward
system and it costs nothing.

**Bottom sheet.** White, 20px top radius, 1px top border, 16px padding, safe-area
inset at the bottom, one full-width button. Every item resolves into this sheet.

**Mascot.** A green sprout character (not an owl). Appears: at the start of a lesson,
next to an example, when a streak milestone lands, and in the empty states. Never
between the student and the answer.

## Screens

### Path

    ┌──────────────────────────────────────┐
│  🔥 12    💎 340    ⚡ 25             │
│ ┌──────────────────────────────────┐ │
│ │ ICT · MODULE E2C                 │ │
│ │ Algorithm and Programming        │ │
│ └──────────────────────────────────┘ │
│              ╭───╮                   │
│              │ ★ │  done             │
│           ╭──╯   ╰──╮                │
│        ╭──╯  ╭───╮  ╰──╮             │
│        │ ✓   │START│   │             │
│        ╰─────╯╰───╯╰──╯              │
│     ╭──╯   ╭───╮   ╰──╮              │
│     │ 🔒   │ 🔒 │      │              │
│     ╰──────╯───╯──────╯              │
├──────────────────────────────────────┤
│  🏠     🏋️     🏆     ⌨️     👤      │
└──────────────────────────────────────┘

The path is one module at a time. Lessons are nodes, not a list, because a list
invites scrolling and a path invites the next step.

Bottom tabs: Path, Drills, Board, Playground, Me.

### Lesson player

    ┌──────────────────────────────────────┐
│  ✕   ▓▓▓▓▓▓▓▓▓▓▓░░░░░░    12 IN A ROW│
│                                      │
│  ⚠ HARD EXERCISE                     │
│                                      │
│  Which name is valid?                │
│                                      │
│   (mascot)   ┌────────────────────┐  │
│              │ items = [1, 2, 3]  │  │
│              │ print(items[2])    │  │
│              └────────────────────┘  │
│                                      │
│  ┌──────────┐  ┌──────────┐          │
│  │  2cool   │  │  cool_2  │          │
│  └──────────┘  └──────────┘          │
│  ┌──────────┐                        │
│  │  cool-2  │                        │
│  └──────────┘                        │
├──────────────────────────────────────┤
│            [  CHECK  ]               │
└──────────────────────────────────────┘

Wrong answer: the sheet turns red-pale, the chosen card gets a red border and the
correct one a green border, a one-line explanation appears, and the button reads
CONTINUE. The explanation is never hidden behind a tap.

### Fill, as a word bank

Duolingo's token bank is a better fit than typing for recall items on a phone. Same
schema, two renderers: keyboard on desktop, tappable tokens on mobile.

    print(items[ ___ ])

    [ 1 ]  [ 2 ]  [ 3 ]  [ 0 ]

### Drills

Same player, mixed deck, no path. Shows the due count and a "start" node. Interleaved
across modules by design; the UI shows a module swatch on each item so the switching
is visible rather than confusing.

### Board

Ranks by distinct items faced today. Top three plus your own row. Accuracy is a
secondary column, never the sort key.

### Builder

Same components, three panes: block list, canvas (the real student renderer), and
the payload form. Validation appears as red inline text exactly where the student
would see the item, so the teacher sees the consequence of a bad distractor.

## Motion

- Button press: 80 ms, translateY 4px, edge collapses.
- Node complete: the rim pops and a check scales from 0.6 to 1.0 with a slight
  overshoot, 220 ms.
- Stamp: scale 0.4 to 1.05 to 1.0, rotate -8deg, 260 ms, then hold 600 ms and fade.
- Correct answer: sheet slides up 180 ms ease-out.
- Nothing else animates. A revision tool that moves constantly is exhausting.

## Mobile first

This is used on a phone in a classroom, so the phone is the primary target and
desktop is the wide variant, not the reverse. 44px minimum tap targets, bottom sheet
for all actions, no hover-only affordances, and the Python runner opens as a
full-height sheet with a floating Run button.

## Tokens

Written to tailwind config as semantic names — bg, line, ink, green, green-dk,
blue, purple, gold, red, and their -pale and -dk variants — so no component ever
hardcodes a hex.
