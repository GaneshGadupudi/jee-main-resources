import { useEffect, useRef, useState } from "react";
import { load, save, scoreContest, trackTime } from "@/lib/contest";

// Shared state machine for timed tests (weekly challenge and mock tests): active session, auto-submit, history.
export function useTestRunner({ activeKey, historyKey, contests, onAddMistakes, onFinish }) {
  const [now, setNow] = useState(() => Date.now());
  const [history, setHistory] = useState([]);
  const [active, setActive] = useState(null);
  const [resultId, setResultId] = useState(null);
  const [ready, setReady] = useState(false);
  const submitting = useRef(false);

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    setHistory(load(historyKey, []));
    const saved = load(activeKey, null);
    if (saved && contests.some((contest) => contest.id === saved.contestId)) setActive({ ...saved, enteredAt: Date.now() });
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contestOf = (id) => contests.find((contest) => contest.id === id);
  const updateActive = (next) => { setActive(next); save(activeKey, next); };
  const exit = () => {
    setActive(null);
    try { localStorage.removeItem(activeKey); } catch { /* ignore */ }
  };

  const start = (contest, endsAt) => {
    submitting.current = false;
    updateActive({ contestId: contest.id, startedAt: Date.now(), enteredAt: Date.now(), endsAt, answers: {}, marked: [], current: 0, spent: {} });
  };

  const submit = (raw) => {
    if (submitting.current) return;
    submitting.current = true;
    const session = trackTime(raw);
    const contest = contestOf(session.contestId);
    const answers = contest.questions.map((_, index) => session.answers[index] ?? null);
    const result = scoreContest(contest.questions, answers);
    const entry = { id: `${contest.id}@${Date.now()}`, contestId: contest.id, title: contest.title, virtual: !!contest.virtual, at: Date.now(), timeTaken: Math.min(Date.now(), session.endsAt) - session.startedAt, answers, spent: contest.questions.map((_, index) => Math.round((session.spent[index] || 0) / 1000)), total: contest.questions.length, ...result };
    const nextHistory = [entry, ...history];
    setHistory(nextHistory);
    save(historyKey, nextHistory);
    onAddMistakes(contest.questions.filter((question, index) => answers[index] !== null && answers[index] !== question.answer).map((question) => ({ subject: question.subject, chapter: question.chapter, text: question.text, options: question.options, answer: question.answer, explanation: question.explanation, reason: "" })));
    onFinish?.({ questions: contest.questions, answers, timeTaken: entry.timeTaken, source: activeKey.includes("mock") ? "mock" : "contest" });
    setActive(null);
    try { localStorage.removeItem(activeKey); } catch { /* ignore */ }
    setResultId(entry.id);
  };

  // Auto-submit when the clock runs out.
  useEffect(() => {
    if (ready && active && now >= active.endsAt) submit(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, ready, active]);

  return { now, history, active, resultId, setResultId, contestOf, updateActive, start, submit, exit };
}
