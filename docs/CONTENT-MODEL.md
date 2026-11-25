# Content model

Two layers, deliberately separate:

- **items** — the atomic graded questions. Owned by the review engine, scheduled
  individually, never repeated inside a session.
- **lessons** — an ordered run of items plus the minimum prose needed to make the
  first attempt fair. A lesson is a syllabus of first exposures.

Everything here is enforced by lib/schema.ts at import and at save. If the builder
lets you save something this file forbids, it is a bug.

## Item shape

    {
      "id": "b1f0c2e4-...",          // uuid, generated once, never regenerated
      "kind": "fill",
      "prompt": "Complete the line so it prints 6.",
      "level": "recall",             // derived from kind, overridable
      "concepts": ["arithmetic"],    // exactly one
      "requires": ["print"],         // prerequisites, used for leech demotion
      "explain": "Multiplication binds tighter than addition.",
      "misconception": "Reading left to right gives 9."
    }

## Kinds

| kind | rung | marks | grading | answer |
|---|---|---|---|---|
| prose | - | 0 | none | - |
| callout | - | 0 | none | - |
| code | - | 0 | none | - |
| formula | - | 0 | none | - |
| mcq | recognize | 1 | exact option id | option id |
| fill | recall | n blanks | per blank, accepted list | string[] |
| predict | apply | 1 | normalized stdout compare | string |
| numeric | apply | 1-2 | abs/rel tolerance, sig figs, unit | number |
| challenge | construct | n tests | per test, weighted, hidden tests | source |
| structured | construct | sum(parts) | self-mark or teacher-mark vs scheme | per part |
| repl | - | 0 | none | - |

### mcq

    {
      "kind": "mcq",
      "prompt": "Which name is valid in Python?",
      "options": [
        { "id": "a", "text": "2cool",  "misconception": "Digit at the start - the parser rejects it." },
        { "id": "b", "text": "cool_2", "why": "Letters, digits, underscore; not starting with a digit." },
        { "id": "c", "text": "cool-2", "misconception": "Hyphen reads as minus, so this is an expression." }
      ],
      "answer": "b",
      "explain": "Identifiers may not start with a digit and may not contain a hyphen."
    }

Enforced: every non-answer option must carry a non-empty misconception. A
distractor without a stated misconception is guessing, and guessing teaches nothing.

### fill

    {
      "kind": "fill",
      "prompt": "Print the third item of the list.",
      "template": "print(items[___])",
      "blanks": [{ "accept": ["2"], "hint": "Python counts from zero." }],
      "explain": "Indices 0, 1, 2 - the third item is index 2."
    }

One or two blanks maximum. Accepted answers are compared after normalization:
CRLF to LF, trailing whitespace stripped per line, outer whitespace trimmed,
case-insensitive unless caseSensitive is set. Never compare raw strings.

### predict

    { "kind": "predict", "lang": "python",
      "source": "x = [1, 2, 3]\nprint(len(x) * 'a')",
      "expectOutput": "aaa",
      "normalize": "normalized" }

Run in the real runner, compare normalized stdout. The cheapest rung-3 item, and
the one students most often get wrong — which is the point.

### numeric

    { "kind": "numeric", "prompt": "A 2 kg mass accelerates at 3 m s^-2. Net force?",
      "answer": 6, "tolerance": 0.02, "toleranceMode": "relative",
      "unit": "N", "sigFigs": 2 }

Physics only. Unit and sig-fig errors are graded separately from the value, and the
feedback names which one was lost — because in DSE that is where the marks go.

### challenge

    { "kind": "challenge", "lang": "python",
      "prompt": "Return the sum of all even numbers in the list.",
      "starter": "def sum_evens(xs):\n    pass\n",
      "solution": "def sum_evens(xs):\n    return sum(x for x in xs if x % 2 == 0)\n",
      "hints": ["Which operator tells you a number is even?", "What does sum() accept?"],
      "tests": [
        { "name": "basic",    "expect": "6",  "weight": 1 },
        { "name": "empty",    "expect": "0",  "weight": 1 },
        { "name": "hidden-1", "expect": "12", "weight": 1, "hidden": true }
      ] }

At least one hidden test. Visible-only tests get gamed within a week.

### structured

    { "kind": "structured", "stem": "A student writes the loop below...",
      "marking": "self",
      "parts": [
        { "prompt": "State the number of iterations.", "marks": 2,
          "modelAnswer": "5 iterations: 0,1,2,3,4.",
          "markScheme": ["1 mark: recognises range(5)", "1 mark: states 5, not 4"] }
      ] }

Self-marking is a metacognitive exercise, not a shortcut: the student ticks the
scheme points they believe they earned, and the teacher sees self-mark drift
(student claims 2, teacher awards 0) as a separate signal worth reteaching.

## Lesson shape

    {
      "moduleId": "ict.e2c",
      "slug": "variables-and-names",
      "title": "Variables and names",
      "minutes": 4,
      "concepts": ["variables", "assignment"],
      "blocks": [ pretest, note, retest, variant, apply ]
    }

Hard limits: 4-8 items, at most one prose block before each item, prose capped at
120 words, and the last block must be graded.

## The bank

Items are addressable independently of lessons. A drill deck is a query:

    SELECT * FROM blocks
     WHERE kind IN ('mcq','fill','predict','numeric','challenge')
       AND module_id = $1
     ORDER BY due_at ASC NULLS LAST
     LIMIT 15

This is why the same item can appear in a lesson, in a class mock paper, and in a
student's review deck without duplication.

## Importing existing notes

Importer contract: npm run import -- file.md produces draft lessons, idempotent by
slug. It never overwrites a block a human has edited — each block records an origin
hash, and a changed hash means hands off.

Recognised syntax:

    # Lesson title              -> lesson.title
    ## Heading                  -> prose (heading retained)
    fenced block tagged python  -> code, or repl if preceded by <!-- run -->
    > [!TIP] / [!GOTCHA]        -> callout
    ___ or {{ }} inside a line  -> fill blank
    Q: ...  then  - ( ) options -> mcq draft (misconceptions empty, flagged)
    A: ...                      -> answer for the preceding Q
    Why: ...                    -> explain
    ANSWER: ...                 -> opens a challenge with solution
    #concept                    -> concept tag, stripped from text

Anything the importer cannot classify becomes prose and is flagged
needs-splitting in the builder queue, because unclassified prose is where the
120-word limit silently gets violated.
