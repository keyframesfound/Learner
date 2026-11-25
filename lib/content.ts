export const profile = {
  name: "Kai",
  form: "F4",
  streak: 12,
  daysToDse: 128,
  coverage: 41,
  coverageTotal: 60,
  itemsToday: 24,
  dueToday: 12,
};

export type Subject = {
  id: string;
  name: string;
  colour: string;
  d: string;
};

export const subjects: Subject[] = [
  { id: "ict", name: "ICT", colour: "#2D5BFF",
    d: "M2.6 4h18.8v12.4H2.6zM10 16.4h4v2.4h-4zM6.6 18.8h10.8v2.2H6.6z" },
  { id: "physics", name: "Physics", colour: "#7C4DFF",
    d: "M13.6 2.4 5.2 13.6h4.9L9.2 21.6 18.8 9.9h-5.3z" },
  { id: "biology", name: "Biology", colour: "#17A34A",
    d: "M19.6 4.2c-8.2-.6-13.4 2.6-14.6 8.4-.6 3 1.2 5.6 4.2 6.6 6.2 2 10.8-3 10.4-15zM8.6 17.8 16 8.4" },
  { id: "chemistry", name: "Chemistry", colour: "#8A4B08",
    d: "M9 3h6v3.4l4.6 11.2c.8 2-1 4.4-3.2 4.4H7.6c-2.2 0-4-2.4-3.2-4.4L9 6.4zM7.4 14h9.2" },
  { id: "geography", name: "Geography", colour: "#1467A8",
    d: "M12 3.2c3.6 0 6.6 3.4 6.6 7.6S12 20.8 12 20.8 5.4 15 5.4 10.8S8.4 3.2 12 3.2zM12 13.4a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z" },
];

export type Lesson = {
  id: string;
  no: string;
  title: string;
  meta: string;
  state: "done" | "now" | "lock";
};

export const lessons: Lesson[] = [
  { id: "what-a-name-is", no: "01", title: "What a name is", meta: "5 items · Smooth", state: "done" },
  { id: "assignment", no: "02", title: "Assignment and rebinding", meta: "6 items · Fluent", state: "done" },
  { id: "identifiers", no: "03", title: "Valid identifiers", meta: "6 items · 4 min", state: "now" },
  { id: "types", no: "04", title: "Types and conversion", meta: "Locked · finish 03", state: "lock" },
  { id: "indexing", no: "05", title: "Indexing a list", meta: "Locked", state: "lock" },
];

export type Option = { text: string; code?: boolean };

export const item = {
  level: "Hard",
  prompt: "Which name is valid Python?",
  code: "items = [1, 2, 3]",
  options: [
    { text: "2cool" },
    { text: "cool_2", code: true },
    { text: "cool-2" },
    { text: "class" },
  ],
  answer: 1,
  why: "cool_2 — starts with a letter, and underscores are allowed.",
  wrongWhy: "Names cannot start with a digit, and cool-2 parses as a subtraction. Answer: cool_2.",
};

export type BattleQuestion = {
  topic: string;
  q: string;
  a: string[];
  c: number;
};

export const bank: BattleQuestion[] = [
  { topic: "What a name is", q: 'After <code>a = [1, 2]</code> and <code>b = a</code>, how many list objects exist?',
    a: ["One", "Two", "Zero", "Depends on b"], c: 0 },
  { topic: "What a name is", q: "In Python, a variable name is best described as…",
    a: ["A box holding a value", "A label for an object", "A fixed memory address", "A copy of the value"], c: 1 },
  { topic: "Assignment and rebinding", q: "What does <code>x = 5; x = x + 1; print(x)</code> show?",
    a: ["5", "6", "x + 1", "An error"], c: 1 },
  { topic: "Assignment and rebinding", q: "After <code>a = 3; b = a; a = 10</code>, what is <code>b</code>?",
    a: ["10", "3", "None", "13"], c: 1 },
  { topic: "Assignment and rebinding", q: "After <code>a, b = 1, 2; a, b = b, a</code>, what is <code>a</code>?",
    a: ["1", "2", "(1, 2)", "An error"], c: 1 },
  { topic: "Valid identifiers", q: "Which of these is a valid Python name?",
    a: ["<code>2fast</code>", "<code>my-name</code>", "<code>_total</code>", "<code>class</code>"], c: 2 },
  { topic: "Valid identifiers", q: "Why is <code>for = 3</code> an error?",
    a: ["Names need 4+ letters", "<code>for</code> is a keyword", "Numbers need quotes", "Missing a colon"], c: 1 },
  { topic: "Valid identifiers", q: "Are <code>Score</code> and <code>score</code> the same name?",
    a: ["Yes, case is ignored", "No, case-sensitive", "Only in functions", "Only for numbers"], c: 1 },
  { topic: "Types and conversion", q: 'What is <code>int("7") + 3</code>?',
    a: ['"73"', "10", "73", "An error"], c: 1 },
  { topic: "Types and conversion", q: "What does <code>type(3.0)</code> return?",
    a: ["<code>int</code>", "<code>str</code>", "<code>float</code>", "<code>number</code>"], c: 2 },
  { topic: "Indexing a list", q: "Given <code>xs = [10, 20, 30]</code>, what is <code>xs[-1]</code>?",
    a: ["10", "20", "30", "IndexError"], c: 2 },
  { topic: "Indexing a list", q: "Given <code>xs = [10, 20, 30]</code>, what is <code>xs[1]</code>?",
    a: ["10", "20", "30", "IndexError"], c: 1 },
];

export const board = [
  { rank: 1, name: "Mei Lam", items: 38 },
  { rank: 2, name: "Chan Ka Ho", items: 35 },
  { rank: 3, name: "Wong Tsz Yan", items: 31 },
  { rank: 4, name: "Kai (you)", items: 24 },
  { rank: 5, name: "Yip Ka-ho", items: 22 },
  { rank: 6, name: "So Tsz-wing", items: 18 },
];
