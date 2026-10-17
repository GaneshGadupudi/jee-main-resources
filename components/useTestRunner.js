import { useEffect, useRef, useState } from "react";
import { scoreContest, trackTime } from "@/lib/contest";
import { api } from "@/lib/client-api";
import { dayKey } from "@/lib/progress";

// Shared state machine for timed tests (weekly challenge and mock tests): active session, auto-submit, history.
// The dashboard owns `history` and `activeSession` (loaded from the database) so they survive switching tabs and feed the notifications;
// this hook reports every change through onHistory / onActive and saves it to the server.
export function useTestRunner({ type, contests, history, activeSession, ready, onHistory, onActive, onAddMistakes, onFinish }) {
  const [now, setNow] = useState(() => Date.now());
  const [resultId, setResultId] = useState(null);
  const submitting = useRef(false);
  const saving = useRef({ pending: null, busy: false });
  const active = activeSession;

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);

  // A test that was running when the student left: resume it (restart the question stopwatch), or drop it if that test no longer exists.
  useEffect(() => {
    if (!ready || !active) return;
    if (contests.some((contest) => contest.id === active.contestId)) onActive({ ...active, enteredAt: Date.now() });
    else { onActive(null); api("DELETE", `/api/me/tests?type=${type}`); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const contestOf = (id) => contests.find((contest) => contest.id === id);

  // Autosaves are sent one at a time, newest state wins, so quick clicks cannot overwrite each other out of order.
  const flush = async () => {
    const state = saving.current;
    if (state.busy) return;
    state.busy = true;
    while (state.pending) { const session = state.pending; state.pending = null; await api("PUT", "/api/me/tests", { type, session }); }
    state.busy = false;
  };
  const idle = async () => { while (saving.current.busy) await new Promise((resolve) => setTimeout(resolve, 25)); };
  const updateActive = (next) => {
    onActive(next);
    const contest = contestOf(next.contestId);
    saving.current.pending = { ...next, title: contest?.title, virtual: !!contest?.virtual, total: contest?.questions.length };
    flush();
  };
  const exit = () => {
    saving.current.pending = null;
    onActive(null);
    idle().then(() => api("DELETE", `/api/me/tests?type=${type}`));
  };

  const start = (contest, endsAt) => {
    submitting.current = false;
    updateActive({ contestId: contest.id, startedAt: Date.now(), enteredAt: Date.now(), endsAt, answers: {}, marked: [], current: 0, spent: {} });
  };

  const submit = (raw) => {
    if (submitting.current) return;
    submitting.current = true;
    saving.current.pending = null;
    const session = trackTime(raw);
    const contest = contestOf(session.contestId);
    const answers = contest.questions.map((_, index) => session.answers[index] ?? null);
    const result = scoreContest(contest.questions, answers);
    const entry = { id: `${contest.id}@${Date.now()}`, contestId: contest.id, title: contest.title, virtual: !!contest.virtual, at: Date.now(), timeTaken: Math.min(Date.now(), session.endsAt) - session.startedAt, answers, spent: contest.questions.map((_, index) => Math.round((session.spent[index] || 0) / 1000)), total: contest.questions.length, ...result };
    onHistory([entry, ...history]);
    idle().then(() => api("POST", "/api/me/tests", { type, entry: { ...entry, d: dayKey(), startedAt: session.startedAt, endsAt: session.endsAt } }));
    onAddMistakes(contest.questions.filter((question, index) => answers[index] !== null && answers[index] !== question.answer).map((question) => ({ subject: question.subject, chapter: question.chapter, text: question.text, options: question.options, answer: question.answer, explanation: question.explanation, reason: "" })));
    onFinish?.({ questions: contest.questions, answers, timeTaken: entry.timeTaken, source: type });
    onActive(null);
    setResultId(entry.id);
  };

  // Auto-submit when the clock runs out.
  useEffect(() => {
    if (ready && active && now >= active.endsAt) submit(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, ready, active]);

  return { now, history, active, resultId, setResultId, contestOf, updateActive, start, submit, exit };
}
