/**
 * Learner — content contracts.
 *
 * Single source of truth. The renderer, the grader, the builder and the importer
 * all derive from this file. Cross-field rules live in validateBlock() so the
 * builder can report them per-field on keystroke, and the lesson schema can
 * report them per-block on save.
 */
import { z } from 'zod';

/* ── primitives ─────────────────────────────────────────────── */

const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'must be a uuid',
);

const concept = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case concept id');

export const trackId = z.enum(['ict', 'phy']);
export const lang = z.enum(['python', 'html', 'css', 'js', 'sql', 'text']);
export const level = z.enum(['recognize', 'recall', 'apply', 'construct']);

export const MAX_PROSE_WORDS = 120;
export const MAX_ITEMS_PER_LESSON = 8;
export const MIN_ITEMS_PER_LESSON = 4;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/* ── block shapes (all plain objects, so the union discriminates) ── */

const prose = z.object({
  id: uuid,
  kind: z.literal('prose'),
  md: z.string().min(1),
});

const callout = z.object({
  id: uuid,
  kind: z.literal('callout'),
  tone: z.enum(['tip', 'gotcha', 'note']),
  md: z.string().min(1),
});

const code = z.object({
  id: uuid,
  kind: z.literal('code'),
  lang,
  source: z.string().min(1),
  caption: z.string().default(''),
});

const formula = z.object({
  id: uuid,
  kind: z.literal('formula'),
  latex: z.string().min(1),
  glossary: z.record(z.string(), z.string()).default({}),
});

const repl = z.object({
  id: uuid,
  kind: z.literal('repl'),
  lang: z.enum(['python', 'html', 'js']),
  starter: z.string().default(''),
});

const itemBase = {
  id: uuid,
  concepts: z.array(concept).length(1, 'exactly one concept per item'),
  requires: z.array(concept).default([]),
  explain: z.string().min(1),
};

const mcqOption = z.object({
  id: z.enum(['a', 'b', 'c', 'd', 'e']),
  text: z.string().min(1),
  why: z.string().default(''),
  misconception: z.string().default(''),
});

const mcq = z.object({
  ...itemBase,
  kind: z.literal('mcq'),
  prompt: z.string().min(1),
  options: z.array(mcqOption).min(3).max(5),
  answer: z.enum(['a', 'b', 'c', 'd', 'e']),
  shuffle: z.boolean().default(true),
});

const fill = z.object({
  ...itemBase,
  kind: z.literal('fill'),
  prompt: z.string().min(1),
  template: z.string().min(1),
  blanks: z
    .array(
      z.object({
        accept: z.array(z.string().min(1)).min(1),
        hint: z.string().default(''),
        caseSensitive: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(2, 'two blanks maximum - cognitive load'),
});

const predict = z.object({
  ...itemBase,
  kind: z.literal('predict'),
  prompt: z.string().default('What does this print?'),
  lang: z.enum(['python', 'js']),
  source: z.string().min(1),
  expectOutput: z.string(),
  normalize: z.enum(['exact', 'normalized']).default('normalized'),
});

const numeric = z.object({
  ...itemBase,
  kind: z.literal('numeric'),
  prompt: z.string().min(1),
  answer: z.number().finite(),
  tolerance: z.number().nonnegative().default(0.02),
  toleranceMode: z.enum(['absolute', 'relative']).default('absolute'),
  unit: z.string().default(''),
  sigFigs: z.number().int().min(1).max(6).optional(),
});

const test = z.object({
  name: z.string().min(1),
  stdin: z.string().default(''),
  expect: z.string(),
  mode: z.enum(['exact', 'normalized', 'regex']).default('normalized'),
  weight: z.number().positive().default(1),
  hidden: z.boolean().default(false),
});

const challenge = z.object({
  ...itemBase,
  kind: z.literal('challenge'),
  prompt: z.string().min(1),
  lang: z.enum(['python', 'html', 'js', 'css']),
  starter: z.string().default(''),
  solution: z.string().min(1),
  hints: z.array(z.string()).default([]),
  tests: z.array(test).min(1),
});

const structuredPart = z.object({
  prompt: z.string().min(1),
  marks: z.number().int().min(1).max(8),
  modelAnswer: z.string().min(1),
  markScheme: z.array(z.string()).min(1),
});

const structured = z.object({
  ...itemBase,
  kind: z.literal('structured'),
  stem: z.string().min(1),
  marking: z.enum(['self', 'teacher']).default('self'),
  parts: z.array(structuredPart).min(1),
});

/* ── union ──────────────────────────────────────────────────── */

export const block = z.discriminatedUnion('kind', [
  prose, callout, code, formula, repl,
  mcq, fill, predict, numeric, challenge, structured,
]);

export type Block = z.infer<typeof block>;

/* ── rungs and marks ────────────────────────────────────────── */

export const GRADED = [
  'mcq', 'fill', 'predict', 'numeric', 'challenge', 'structured',
] as const;

export type GradedKind = (typeof GRADED)[number];
export type GradedBlock = Extract<Block, { kind: GradedKind }>;

export const isGraded = (b: Block): b is GradedBlock =>
  (GRADED as readonly string[]).includes(b.kind);

export const rungOf = (b: Block): z.infer<typeof level> | null => {
  switch (b.kind) {
    case 'mcq': return 'recognize';
    case 'fill': return 'recall';
    case 'predict':
    case 'numeric': return 'apply';
    case 'challenge':
    case 'structured': return 'construct';
    default: return null;
  }
};

export const marksOf = (b: Block): number => {
  switch (b.kind) {
    case 'mcq':
    case 'predict':
      return 1;
    case 'numeric':
      return b.unit ? 2 : 1;
    case 'fill':
      return b.blanks.length;
    case 'challenge':
      return b.tests.reduce<number>((n, t) => n + t.weight, 0);
    case 'structured':
      return b.parts.reduce<number>((n, p) => n + p.marks, 0);
    default:
      return 0;
  }
};

/* ── cross-field rules ──────────────────────────────────────── */

export type BlockIssue = { path: Array<string | number>; message: string };

export function validateBlock(b: Block): BlockIssue[] {
  const out: BlockIssue[] = [];

  if (b.kind === 'prose' && words(b.md) > MAX_PROSE_WORDS) {
    out.push({
      path: ['md'],
      message: 'prose is ' + words(b.md) + ' words; the cap is ' + MAX_PROSE_WORDS,
    });
  }

  if (b.kind === 'mcq') {
    const ids = b.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) {
      out.push({ path: ['options'], message: 'duplicate option ids' });
    }
    if (!ids.includes(b.answer)) {
      out.push({ path: ['answer'], message: 'answer is not one of the options' });
    }
    b.options.forEach((o, i) => {
      if (o.id !== b.answer && o.misconception.trim() === '') {
        out.push({
          path: ['options', i, 'misconception'],
          message: 'every distractor needs the misconception it encodes',
        });
      }
      if (/^\s*(all|none) of the above\s*$/i.test(o.text)) {
        out.push({ path: ['options', i, 'text'], message: 'all/none-of-the-above is banned' });
      }
    });
  }

  if (b.kind === 'fill') {
    const count = b.template.split('___').length - 1;
    if (count === 0) {
      out.push({ path: ['template'], message: 'template needs at least one ___' });
    } else if (count !== b.blanks.length) {
      out.push({
        path: ['blanks'],
        message: 'template has ' + count + ' blanks but ' + b.blanks.length + ' are defined',
      });
    }
  }

  return out;
}

/* ── lesson ─────────────────────────────────────────────────── */

export const lesson = z
  .object({
    moduleId: z.string().regex(/^(ict|phy)\.[a-z0-9]+$/),
    slug: concept,
    title: z.string().min(3).max(80),
    summary: z.string().max(200).default(''),
    minutes: z.number().int().min(2).max(8).default(4),
    concepts: z.array(concept).min(1).max(3),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
    ord: z.number().int().nonnegative().default(0),
    blocks: z.array(block).min(3).max(12),
  })
  .superRefine((l, ctx) => {
    const issue = (path: Array<string | number>, message: string) =>
      ctx.addIssue({ code: 'custom', message, path });

    const items = l.blocks.filter(isGraded);
    if (items.length < MIN_ITEMS_PER_LESSON) {
      issue(['blocks'], 'a lesson needs at least ' + MIN_ITEMS_PER_LESSON + ' items, found ' + items.length);
    }
    if (items.length > MAX_ITEMS_PER_LESSON) {
      issue(['blocks'], 'a lesson may hold at most ' + MAX_ITEMS_PER_LESSON + ' items');
    }

    const last = l.blocks[l.blocks.length - 1];
    if (last && !isGraded(last)) {
      issue(['blocks'], 'a lesson must end on a graded item');
    }

    let run = 0;
    l.blocks.forEach((b, i) => {
      run = b.kind === 'prose' ? run + 1 : 0;
      if (run > 1) {
        issue(['blocks', i], 'two prose blocks in a row - merge them or add an item');
      }
      for (const bad of validateBlock(b)) {
        issue(['blocks', i, ...bad.path], bad.message);
      }
    });

    const declared = new Set(l.concepts);
    l.blocks.forEach((b, i) => {
      if (!isGraded(b)) return;
      for (const c of b.concepts) {
        if (!declared.has(c)) {
          issue(['blocks', i, 'concepts'], 'item concept "' + c + '" is not declared on the lesson');
        }
      }
    });
  });

export type Lesson = z.infer<typeof lesson>;

/* ── attempt ────────────────────────────────────────────────── */

export const attemptInput = z.object({
  blockId: uuid,
  answer: z.unknown(),
  ms: z.number().int().nonnegative().max(3_600_000).default(0),
  hintsUsed: z.number().int().nonnegative().default(0),
});

export type AttemptInput = z.infer<typeof attemptInput>;

export type Grade = {
  correct: boolean | null;
  awarded: number;
  total: number;
  feedback: Array<{ ok: boolean; note: string; blank?: number; part?: number }>;
};
