import { resources } from "./resources";
import { chapterContent } from "./chapters";

// "2-3" -> 2.5, "1" -> 1, "0-1" -> 0.5 (approx. questions per paper)
const weightOf = (range) => { const parts = String(range).split("-").map(Number); return parts.reduce((a, b) => a + b, 0) / parts.length; };

export const allChapters = resources.flatMap(([subject, items]) => items.map(([chapter, count, file]) => ({ id: `${subject}:${chapter}`, subject, chapter, weight: weightOf(count), file })));

export const weightLabel = (weight) => weight >= 2.5 ? "High weightage" : weight >= 1.5 ? "Medium weightage" : "Low weightage";

export const todayKey = () => new Date().toLocaleDateString("en-CA");

export const daysUntil = (date) => Math.max(0, Math.ceil((new Date(`${date}T00:00:00`) - new Date()) / 86400000));

// How the plan is prioritised depends on how much time is left before the exam.
export function planMode(daysLeft) {
  if (daysLeft <= 60) return { key: "urgent", label: "Exam is close", note: "Your plan puts the highest-weightage chapters first." };
  if (daysLeft <= 180) return { key: "balanced", label: "Building up", note: "Your plan balances high-weightage chapters across all subjects." };
  return { key: "foundation", label: "Plenty of time", note: "Your plan spreads across subjects to build strong foundations." };
}

const MODES = {
  urgent: { weightFactor: 1, spreadPenalty: 0.75 },
  balanced: { weightFactor: 1, spreadPenalty: 1.5 },
  foundation: { weightFactor: 0.5, spreadPenalty: 2.5 },
};
const FOCUS_BONUS = 1.5;
const STRENGTH_PENALTY = 0.25;
// Small nudge towards chapters that already have overview + questions; remove once all chapters have content.
const CONTENT_BONUS = 0.5;

const chapterSlots = (hours) => { const n = parseInt(hours, 10); return n >= 6 ? 4 : n >= 4 ? 3 : 2; };

export function buildPlan({ profile, daysLeft, doneChapters = [], keep = [] }) {
  const { weightFactor, spreadPenalty } = MODES[planMode(daysLeft).key];
  const focus = profile.focus || [];
  const strengths = profile.strengths || [];
  const keptIds = keep.map((task) => task.chapterId);
  let pool = allChapters.filter((c) => !doneChapters.includes(c.id) && !keptIds.includes(c.id));
  if (!pool.length) pool = allChapters.filter((c) => !keptIds.includes(c.id)); // everything studied once: start another round
  const picked = [];
  const slots = Math.max(0, chapterSlots(profile.hours) - keep.length);
  while (picked.length < slots && pool.length) {
    const score = (c) => c.weight * weightFactor + (focus.includes(c.subject) ? FOCUS_BONUS : 0) - (strengths.includes(c.subject) ? STRENGTH_PENALTY : 0) + (chapterContent[c.id] ? CONTENT_BONUS : 0) - spreadPenalty * (picked.filter((p) => p.subject === c.subject).length + keep.filter((k) => k.subject === c.subject).length);
    const best = pool.reduce((a, b) => (score(b) > score(a) ? b : a));
    picked.push(best);
    pool = pool.filter((c) => c.id !== best.id);
  }
  const toTask = (c) => ({ id: `study:${c.id}`, type: "chapter", chapterId: c.id, subject: c.subject, chapter: c.chapter, weight: c.weight, file: c.file, minutes: 40, title: `Revise ${c.chapter}` });
  return [
    ...keep,
    ...picked.map(toTask),
    { id: "mistakes", type: "mistakes", title: "Review a question you got wrong", minutes: 20 },
    { id: "block", type: "routine", title: "Plan one focused study block", minutes: 15 },
  ];
}
