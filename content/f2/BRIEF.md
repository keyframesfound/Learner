# F2 Science lesson brief

Write one lesson from a Hong Kong junior-secondary science textbook, as JSON.

## Source
Your section's text is at /private/var/folders/wt/yh1d_j155xx4j0xlrz1pc5wc0000gn/T/f2/<ID>.txt
Headings in the extraction may be garbled — infer them from context. Read the whole file.

## Output file
/Users/ryanyeung/Developer/Learner/content/f2/<NUMBER>.json
(where NUMBER is the id without the "Ch" prefix: Ch7.1 → 7.1)

## Schema — valid JSON, no extra keys, no markdown fences
{
  "id": "7.1",
  "chapter": "Ch 7",
  "title": "short section title, Title Case, 2-5 words",
  "minutes": 4,
  "notes": ["paragraph 1", "paragraph 2"],
  "table": { "head": ["Column", "Column"], "rows": [["a", "b"], ["c", "d"]] },
  "callout": "one exam tip, or an empty string",
  "questions": [
    { "prompt": "…", "code": [],
      "options": [{ "text": "…" }, { "text": "…" }, { "text": "…" }, { "text": "…" }],
      "answer": 1,
      "why": "one sentence naming the right idea",
      "wrongWhy": "one sentence naming the misconception, ending with the correct answer" }
  ]
}

## Content rules
- notes: 2–3 paragraphs, 40–90 words each, plain sentences a 13-year-old can read. Cover the core idea, key terms (bold with **term**), and one worked example. No invented facts — everything must be supported by the source text.
- table: optional. Omit the key entirely when the section has no natural comparison. Max 4 rows, max 3 columns.
- callout: optional exam tip; use "" when nothing stands out.
- questions: EXACTLY 4, four options each, one correct, answer is the 0-based index.
  - Test understanding, not trivia. At least one application or data question.
  - Distractors plausible, tied to real misconceptions. No "all/none of the above".
  - why: one sentence.
  - wrongWhy: name the misconception, then state the correct answer ("… . Answer: 78%.").
- British spelling (colour, vapour, metre, sulphate). Units: °C, cm³, g/cm³.
- "code" is always [].

## Verify before finishing
cd /Users/ryanyeung/Developer/Learner && node -e "const j=require('./content/f2/<NUMBER>.json'); if(j.questions.length!==4) throw 'need 4'; j.questions.forEach(q=>{if(q.options.length!==4) throw 'need 4 options'; if(!(q.answer>=0&&q.answer<4)) throw 'bad answer'}); if(!j.notes.length) throw 'no notes'; console.log('ok', j.title)"
It must print ok. Touch no other file. Do not commit or deploy.

## Report
The title you chose, and the four question prompts (one line each).
