import { chapterContent } from "./chapters";

export const SUBJECTS = ["Physics", "Chemistry", "Mathematics"];
export const MARKS = { correct: 4, wrong: -1 };
const MINUTES_PER_QUESTION = 2;

const subjectQuestions = (subject) => Object.entries(chapterContent)
  .filter(([id]) => id.startsWith(`${subject}:`))
  .flatMap(([id, content]) => content.questions.map((question, index) => ({ ...question, subject, chapter: id.split(":")[1], qid: `${id}#${index}` })));

const pick = (from, to) => SUBJECTS.flatMap((subject) => subjectQuestions(subject).slice(from, to));
const dateKey = (date) => date.toLocaleDateString("en-CA");
const dateLabel = (date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });

function makeContest(id, date, questions, extra = {}) {
  return {
    id, title: `Saturday Challenge - ${dateLabel(date)}`, date, questions,
    minutes: questions.length * MINUTES_PER_QUESTION,
    topics: [...new Set(questions.map((q) => q.chapter))].join(", "),
    ...extra,
  };
}

// Saturdays: the next contest (Saturday 8 PM) and the two before it, as virtual contests.
export function getContests(now = new Date()) {
  const start = new Date(now);
  start.setHours(20, 0, 0, 0);
  start.setDate(start.getDate() + ((6 - start.getDay() + 7) % 7));
  const minutes = pick(0, 5).length * MINUTES_PER_QUESTION;
  if (start.getTime() + minutes * 60000 < now.getTime()) start.setDate(start.getDate() + 7);
  const upcoming = makeContest(`weekly-${dateKey(start)}`, start, pick(0, 5), { start, end: new Date(start.getTime() + minutes * 60000) });
  const past = [pick(0, 3), pick(2, 5)].map((questions, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() - 7 * (index + 1));
    return makeContest(`weekly-${dateKey(date)}`, date, questions, { virtual: true });
  });
  return { upcoming, past };
}

export function scoreContest(questions, answers) {
  let correct = 0, wrong = 0;
  const bySubject = Object.fromEntries(SUBJECTS.map((subject) => [subject, { correct: 0, wrong: 0, total: 0 }]));
  questions.forEach((question, index) => {
    const row = bySubject[question.subject];
    row.total += 1;
    if (answers[index] === null || answers[index] === undefined) return;
    if (answers[index] === question.answer) { correct += 1; row.correct += 1; } else { wrong += 1; row.wrong += 1; }
  });
  const attempted = correct + wrong;
  return { correct, wrong, skipped: questions.length - attempted, score: correct * MARKS.correct + wrong * MARKS.wrong, accuracy: attempted ? Math.round((correct / attempted) * 100) : 0, bySubject };
}

export const allQuestions = () => pick(0, 5);

export const pad = (n) => String(n).padStart(2, "0");
export const clock = (ms) => { const total = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(total / 3600); return `${h ? `${pad(h)}:` : ""}${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`; };

// Adds the time spent on the current question to the session and restarts the stopwatch.
export function trackTime(session) {
  const at = Math.min(Date.now(), session.endsAt);
  const spent = { ...(session.spent || {}) };
  spent[session.current] = (spent[session.current] || 0) + Math.max(0, at - (session.enteredAt ?? at));
  return { ...session, spent, enteredAt: at };
}
