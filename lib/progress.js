// Pure helpers that turn the activity logs stored by the dashboard into progress numbers.
// answers:  [{ d: "YYYY-MM-DD", src, s: subject, c: chapter, q: question text, ok: boolean }]
// done:     [{ d, id, m }]   study tasks ticked off, with their planned minutes
// timeLog:  [{ d, m }]       minutes spent in contests and mock tests

export const dayKey = (date = new Date()) => {
  if (typeof date === "string") return date; // already 'YYYY-MM-DD' from SQL CONVERT(CHAR(10), ...)
  return date.toLocaleDateString("en-CA");
};

export function summarize({ answers, done, timeLog, mockHistory = [], hoursPerDay, dailySetSize, now = new Date() }) {
  const today = dayKey(now);
  const correct = answers.filter((a) => a.ok).length;
  const accuracy = answers.length ? Math.round((correct / answers.length) * 100) : null;

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
    accuracy,
    achievements: [
      ["First step", "Answer your first practice question", answers.length >= 1],
      ["Daily finisher", "Answer every question in the daily practice set", dailyToday.size >= dailySetSize],
      ["Plan in motion", "Complete five study tasks", done.length >= 5],
      ["Three-day rhythm", "Build a three-day study streak", streak >= 3],
      ["One-week streak", "Study seven days in a row", streak >= 7],
      ["Two-week streak", "Study fourteen days in a row", streak >= 14],
      ["First mock", "Complete your first mock test", mockHistory.length >= 1],
      ["Mock regular", "Attempt five mock tests", mockHistory.length >= 5],
      ["Accuracy ace", "80%+ accuracy over 20+ answers", answers.length >= 20 && accuracy >= 80],
      ["Century", "Answer one hundred practice questions", answers.length >= 100],
    ],
  };
}

// ---------------------------------------------------------------- subject / chapter strength map

// chapters: the full curriculum list, e.g. allChapters from lib/plan.js [{ id, subject, chapter }]
export function strengthMap({ answers, chapters }) {
  const byChapter = {};
  for (const a of answers) {
    const key = `${a.s}:${a.c}`;
    const row = byChapter[key] || (byChapter[key] = { correct: 0, total: 0 });
    row.total += 1;
    if (a.ok) row.correct += 1;
  }

  const chaptersOut = chapters.map((c) => {
    const row = byChapter[c.id] || { correct: 0, total: 0 };
    const accuracy = row.total ? row.correct / row.total : null;
    const strength = accuracy === null ? "none" : accuracy >= 0.6 ? "strong" : accuracy >= 0.4 ? "moderate" : "weak";
    return { subject: c.subject, chapter: c.chapter, id: c.id, correct: row.correct, total: row.total, accuracy, strength };
  });

  const subjectMap = {};
  for (const c of chaptersOut) {
    const list = subjectMap[c.subject] || (subjectMap[c.subject] = []);
    list.push(c);
  }
  const subjects = Object.entries(subjectMap).map(([subject, list]) => {
    const correct = list.reduce((sum, row) => sum + row.correct, 0);
    const total = list.reduce((sum, row) => sum + row.total, 0);
    return { subject, correct, total, accuracy: total ? correct / total : null, chapters: list.length };
  });
  return { subjects, chapters: chaptersOut };
}

// ---------------------------------------------------------------- predicted score range from mocks

export function predictedScore({ mocks, maxScore }) {
  const valid = mocks.filter((m) => m != null && Number.isFinite(m.score)).sort((a, b) => (b.at || 0) - (a.at || 0));
  if (valid.length < 2) return { available: false, have: valid.length, need: Math.max(0, 2 - valid.length) };

  const recent = valid.slice(0, 5);
  const scores = recent.map((m) => m.score);
  const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  const spread = hi - lo;

  return {
    available: true,
    basedOn: recent.length,
    avg: Math.round(avg * 10) / 10,
    lo, hi, maxScore,
    predLo: Math.max(0, Math.round(avg - spread / 2)),
    predHi: Math.min(maxScore, Math.round(avg + spread / 2)),
  };
}

// ---------------------------------------------------------------- goal tracking: percentile -> marks gap

// Transparent, deliberately rough mapping from JEE Main percentile to % of maximum marks.
// It is an estimate, not a guarantee, and is shown so the student can see the gap to close.
const PERCENTILE_TO_PCT = [
  [50, 0.50], [75, 0.60], [90, 0.75], [95, 0.85], [99, 0.95],
];
function percentileToMarksPercent(p) {
  p = Math.min(99, Math.max(50, Number(p)));
  for (let i = 1; i < PERCENTILE_TO_PCT.length; i++) {
    const [p0, r0] = PERCENTILE_TO_PCT[i - 1];
    const [p1, r1] = PERCENTILE_TO_PCT[i];
    if (p <= p1) return r0 + ((p - p0) / (p1 - p0)) * (r1 - r0);
  }
  return PERCENTILE_TO_PCT[PERCENTILE_TO_PCT.length - 1][1];
}

export function goalGap({ targetPercentile, recentAvgPct, maxScore }) {
  if (!targetPercentile || !maxScore) return null;
  const targetPct = percentileToMarksPercent(targetPercentile);
  const targetMarks = Math.round(targetPct * maxScore);
  let recentMarks = null;
  let gapMarks = null;
  if (recentAvgPct != null) {
    recentMarks = Math.round((recentAvgPct / 100) * maxScore);
    gapMarks = targetMarks - recentMarks;
  }
  return { targetPercentile, targetPct: Math.round(targetPct * 100), targetMarks, recentMarks, gapMarks };
}

// ---------------------------------------------------------------- consistency heatmap (prep momentum calendar)

// Builds per-day activity over the last `days` days (default 180 ≈ 6 months).
// Unique twist: background = volume intensity (like GitHub), border = that day's accuracy quality
// (green ≥60%, red <60% & attempted). This lets a student spot both "did I study?" and "was it useful?" at a glance.
export function dailyHeatmap({ answers = [], done = [], timeLog = [], days = 180, now = new Date() }) {
  const today = dayKey(now);
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));

  const byDay = {};
  const seed = (key) => byDay[key] || (byDay[key] = { date: key, count: 0, correct: 0, minutes: 0 });

  for (const a of answers) {
    const d = dayKey(a.d);
    if (d < dayKey(start) || d > today) continue;
    const row = seed(d);
    row.count += 1;
    if (a.ok) row.correct += 1;
  }
  for (const t of done) {
    const d = dayKey(t.d);
    if (d < dayKey(start) || d > today) continue;
    seed(d).minutes += t.m || 0;
  }
  for (const t of timeLog) {
    const d = dayKey(t.d);
    if (d < dayKey(start) || d > today) continue;
    seed(d).minutes += t.m || 0;
  }

  const dates = [];
  let cursor = new Date(start);
  while (cursor <= now) {
    dates.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const counts = dates.map((d) => byDay[d]?.count || 0);
  const maxCount = Math.max(1, ...counts);
  const intensity = (count) => {
    if (count === 0) return 0;
    if (count <= Math.ceil(maxCount / 4)) return 1;
    if (count <= Math.ceil(maxCount / 2)) return 2;
    if (count <= maxCount) return 3;
    return 4;
  };

  return dates.map((d) => {
    const row = byDay[d] || { date: d, count: 0, correct: 0, minutes: 0 };
    const acc = row.count ? row.correct / row.count : null;
    return {
      date: d,
      count: row.count,
      correct: row.correct,
      accuracy: acc,
      minutes: row.minutes,
      level: intensity(row.count),
      today: d === today,
      // accuracy quality for the border: 'good' | 'weak' | null
      quality: row.count === 0 ? null : (acc >= 0.6 ? "good" : acc > 0 ? "weak" : null),
    };
  });
}
