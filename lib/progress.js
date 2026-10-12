// Pure helpers that turn the activity logs stored by the dashboard into progress numbers.
// answers:  [{ d: "YYYY-MM-DD", src, s: subject, c: chapter, q: question text, ok: boolean }]
// done:     [{ d, id, m }]   study tasks ticked off, with their planned minutes
// timeLog:  [{ d, m }]       minutes spent in contests and mock tests

export const dayKey = (date = new Date()) => date.toLocaleDateString("en-CA");

export function summarize({ answers, done, timeLog, hoursPerDay, dailySetSize, now = new Date() }) {
  const today = dayKey(now);
  const correct = answers.filter((a) => a.ok).length;

  const subjects = {};
  const chapters = {};
  for (const a of answers) {
    const subject = subjects[a.s] || (subjects[a.s] = { subject: a.s, correct: 0, total: 0 });
    subject.total += 1;
    if (a.ok) subject.correct += 1;
    const key = `${a.s}:${a.c}`;
    const chapter = chapters[key] || (chapters[key] = { subject: a.s, chapter: a.c, correct: 0, total: 0 });
    chapter.total += 1;
    if (a.ok) chapter.correct += 1;
  }

  const activeDays = new Set([...answers.map((a) => a.d), ...done.map((t) => t.d), ...timeLog.map((t) => t.d)]);
  let streak = 0;
  const cursor = new Date(now);
  if (!activeDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1); // today not started yet: the streak is still alive
  while (activeDays.has(dayKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }

  const monday = new Date(now);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const week = ["M", "T", "W", "T", "F", "S", "S"].map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = dayKey(date);
    return { label, key, active: activeDays.has(key), today: key === today };
  });
  const weekKeys = new Set(week.map((day) => day.key));
  const weekMinutes = [...done, ...timeLog].filter((entry) => weekKeys.has(entry.d)).reduce((sum, entry) => sum + (entry.m || 0), 0);

  const dailyToday = new Set(answers.filter((a) => a.src === "daily" && a.d === today).map((a) => a.q));

  return {
    total: answers.length,
    correct,
    accuracy: answers.length ? Math.round((correct / answers.length) * 100) : null,
    todayCount: answers.filter((a) => a.d === today).length,
    subjects: Object.values(subjects),
    revisit: Object.values(chapters).filter((c) => c.correct < c.total).sort((a, b) => a.correct / a.total - b.correct / b.total).slice(0, 4),
    tasksDone: done.length,
    streak,
    week,
    weekMinutes,
    weekTarget: Math.max(1, parseInt(hoursPerDay, 10) || 2) * 7 * 60,
    achievements: [
      ["First step", "Answer your first practice question", answers.length >= 1],
      ["Daily finisher", "Answer every question in the daily practice set", dailyToday.size >= dailySetSize],
      ["Plan in motion", "Complete five study tasks", done.length >= 5],
      ["Three-day rhythm", "Build a three-day study streak", streak >= 3],
    ],
  };
}
