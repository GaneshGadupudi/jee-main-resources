import { SUBJECTS, allQuestions } from "./contest";

const MINUTES_PER_QUESTION = 2;

// Deterministic shuffle so a mock test always has the same questions (needed to review old attempts).
function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(list, random) { const copy = [...list]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
function shuffleOptions(question, random) {
  const order = shuffle(question.options.map((_, index) => index), random);
  return { ...question, options: order.map((index) => question.options[index]), answer: order.indexOf(question.answer) };
}
const sectioned = (arrange) => SUBJECTS.flatMap((subject) => arrange(allQuestions().filter((question) => question.subject === subject)));

// Three full-syllabus papers with the same marking scheme (+4 / -1) but different question order and option order.
// As the question bank grows, each paper should get its own questions.
const defs = [
  { id: "mock-1", title: "Mock test 1", tag: "Diagnostic", blurb: "Standard order. Find where you stand.", build: () => sectioned((list) => list) },
  { id: "mock-2", title: "Mock test 2", tag: "Timed practice", blurb: "Reversed order inside each subject.", build: () => sectioned((list) => [...list].reverse()) },
  { id: "mock-3", title: "Mock test 3", tag: "Full simulation", blurb: "Shuffled questions and options, like the real paper.", build: () => { const random = rng(2026); return sectioned((list) => shuffle(list, random).map((question) => shuffleOptions(question, random))); } },
];

export function getMockTests() {
  return defs.map(({ build, ...meta }) => { const questions = build(); return { ...meta, questions, minutes: questions.length * MINUTES_PER_QUESTION }; });
}
