import { NextResponse } from "next/server";
import { userRoute } from "@/lib/api-user";
import { getSession } from "@/lib/auth-server";
import { getState } from "@/lib/user-data";
import { sendMail } from "@/lib/mailer";
import { dayKey } from "@/lib/progress";

// The Monday of the week containing the given day (en-CA "YYYY-MM-DD").
const weekStartKey = (day) => {
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return dayKey(date);
};

export const POST = userRoute(async ({ userId }) => {
  const session = await getSession();
  const email = session && session.email ? String(session.email) : null;
  if (!email) return NextResponse.json({ error: "No email address on your account." }, { status: 400 });

  const today = dayKey(new Date());
  const weekStart = weekStartKey(today);
  const state = await getState(userId, { today, contestKey: undefined });
  const { answers = [], histories = {}, mistakes = [] } = state;
  const mocks = (histories.mock || []).filter((m) => m != null && Number.isFinite(m.score));

  const inWeek = (d) => d >= weekStart && d <= today;
  const weekAnswers = answers.filter((a) => inWeek(a.d));
  const weekCorrect = weekAnswers.filter((a) => a.ok).length;
  const weekPct = weekAnswers.length ? Math.round((weekCorrect / weekAnswers.length) * 100) : 0;
  const weekMocks = mocks.filter((m) => inWeek(new Date(m.at).toISOString().slice(0, 10)));
  const recentMocks = mocks.slice(0, 5);

  // Streak: consecutive days (including today if started) with any practice or test activity.
  const activeDays = new Set([...answers.map((a) => a.d), ...mocks.map((m) => new Date(m.at).toISOString().slice(0, 10))]);
  let streak = 0;
  let cursor = new Date(today);
  if (!activeDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (activeDays.has(dayKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }

  const pendingMistakes = mistakes.filter((m) => !m.revisited).length;

  const subjectLines = [...new Set(weekAnswers.map((a) => a.s))].map((subject) => {
    const rows = weekAnswers.filter((a) => a.s === subject);
    const correct = rows.filter((a) => a.ok).length;
    return `  • ${subject}: ${rows.length} answered, ${correct} correct (${rows.length ? Math.round((correct / rows.length) * 100) : 0}%)`;
  }).join("\n") || "  None this week.";

  const mockLines = recentMocks.map((m) => `  • ${m.title} (${new Date(m.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}): ${m.score} / ${m.maxScore || "–"} · ${m.accuracy}% accuracy`).join("\n") || "  None yet.";

  const text = `
Hi ${session && session.name ? session.name : "there"},

Here is your JEE Compass weekly summary for ${weekStart} to ${today}.

Practice this week
- Questions answered: ${weekAnswers.length}
- Correct: ${weekCorrect} (${weekPct}%)
${subjectLines}

Mock tests
- Mocks this week: ${weekMocks.length}
${mockLines}

Streak: ${streak} day${streak === 1 ? "" : "s"}
Mistake book waiting to be revisited: ${pendingMistakes}

Keep going — every question and every mock brings you closer to your goal.

— JEE Compass
`.trim();

  const html = `
<p>Hi ${session && session.name ? session.name : "there"},</p>
<p>Here is your JEE Compass weekly summary for <strong>${weekStart} to ${today}</strong>.</p>
<h3>Practice this week</h3>
<ul>
  <li>Questions answered: <strong>${weekAnswers.length}</strong></li>
  <li>Correct: <strong>${weekCorrect}</strong> (${weekPct}%)</li>
</ul>
<pre style="background:#f7f8fc;padding:10px;border-radius:8px;font-size:13px;line-height:1.5">${subjectLines}</pre>
<h3>Mock tests</h3>
<ul>
  <li>Mocks this week: <strong>${weekMocks.length}</strong></li>
</ul>
<pre style="background:#f7f8fc;padding:10px;border-radius:8px;font-size:13px;line-height:1.5">${mockLines}</pre>
<p><strong>Streak:</strong> ${streak} day${streak === 1 ? "" : "s"} &nbsp;|&nbsp; <strong>Mistake book waiting:</strong> ${pendingMistakes}</p>
<p>Keep going — every question and every mock brings you closer to your goal.</p>
<p>— JEE Compass</p>
`.trim();

  const sent = await sendMail({
    to: email,
    subject: `Your JEE Compass weekly summary (${weekStart} to ${today})`,
    text,
    html,
  });

  return { ok: true, sent, email };
});
