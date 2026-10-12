"use client";

import { useMemo, useState } from "react";
import { BookOpen, Check, Trophy } from "lucide-react";
import { MARKS, SUBJECTS, clock, getContests, pad } from "@/lib/contest";
import { useTestRunner } from "@/components/useTestRunner";
import TestRoom, { Card, primary, soft } from "@/components/TestRoom";
import TestResult from "@/components/TestResult";

export default function WeeklyChallenge({ registered, setRegistered, onAddMistakes, onFinish, onReason, onExit }) {
  const { upcoming, past } = useMemo(() => getContests(new Date()), []);
  const contests = useMemo(() => [upcoming, ...past], [upcoming, past]);
  const runner = useTestRunner({ activeKey: "jee-contest-active", historyKey: "jee-contest-history", contests, onAddMistakes, onFinish });
  const { now, history, active, resultId, setResultId, contestOf } = runner;
  const [openSolutions, setOpenSolutions] = useState(null);

  const startContest = (contest) => runner.start(contest, contest === upcoming ? upcoming.end.getTime() : Date.now() + contest.minutes * 60000);

  if (active) {
    const contest = contestOf(active.contestId);
    return <TestRoom eyebrow={contest.virtual ? "VIRTUAL CONTEST" : "LIVE CONTEST"} title={contest.title} noun="contest" questions={contest.questions} session={active} now={now} onUpdate={runner.updateActive} onSubmit={runner.submit} onExit={() => { runner.exit(); onExit(); }} />;
  }

  const entry = history.find((item) => item.id === resultId);
  if (entry) return <TestResult eyebrow={entry.virtual ? "VIRTUAL CONTEST RESULT" : "CONTEST RESULT"} entry={entry} questions={contestOf(entry.contestId).questions} backLabel="Back to weekly challenge" onBack={() => setResultId(null)} onReason={onReason} note="Rank and percentile appear here once other students have taken this contest. Wrong answers were added to your mistake book." />;

  const live = now >= upcoming.start.getTime() && now <= upcoming.end.getTime();
  const diff = Math.max(0, upcoming.start.getTime() - now);
  const units = [["Days", Math.floor(diff / 86400000)], ["Hours", Math.floor(diff / 3600000) % 24], ["Minutes", Math.floor(diff / 60000) % 60], ["Seconds", Math.floor(diff / 1000) % 60]];
  const done = history.some((item) => item.contestId === upcoming.id);
  const stats = { count: history.length, best: history.length ? Math.max(...history.map((item) => item.score)) : null, accuracy: history.length ? Math.round(history.reduce((sum, item) => sum + item.accuracy, 0) / history.length) : null };
  const counts = SUBJECTS.map((subject) => [subject, upcoming.questions.filter((question) => question.subject === subject).length]);

  return <div className="space-y-5">
    <div className="flex items-start justify-between"><div><p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">LEARN ALONGSIDE OTHER ASPIRANTS</p><h1 className="text-3xl font-extrabold text-[#18223c]">Weekly Challenge</h1><p className="mt-2 text-sm text-[#73809b]">Register for the weekend contest, race the clock, and review every question afterwards.</p></div><Trophy className="text-[#d29a3a]" /></div>
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">UPCOMING WEEKEND CHALLENGE</p><span className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${live ? "bg-[#ddf6ed] text-[#2c967b]" : "bg-[#f0edff] text-[#6958d2]"}`}>{live ? "LIVE NOW" : "STARTS SOON"}</span></div>
        <h2 className="mt-2 text-xl font-extrabold text-[#27314c]">{upcoming.title}</h2>
        <p className="mt-1 text-sm text-[#73809b]">{upcoming.start.toLocaleDateString("en-GB", { weekday: "long" })}, {upcoming.start.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })} · {upcoming.questions.length} questions · {upcoming.minutes} minutes</p>
        {live ? <p className="mt-5 rounded-xl bg-[#ddf6ed] p-4 text-sm font-bold text-[#2c967b]">The contest is live. Ends in <span className="tabular-nums">{clock(upcoming.end.getTime() - now)}</span></p> : <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">{units.map(([label, value]) => <div key={label} className="rounded-xl border border-[#e4e8f1] bg-[#fafbfe] py-3 text-center"><strong className="block text-2xl tabular-nums text-[#282354]">{pad(value)}</strong><span className="text-[10px] font-bold text-[#8994aa]">{label}</span></div>)}</div>}
        <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-[#69758d] sm:grid-cols-4">{[...counts, ["Marking", `+${MARKS.correct} / ${MARKS.wrong}`]].map(([label, value]) => <div key={label} className="flex min-h-14 flex-col items-start justify-center gap-1 rounded-lg bg-[#fafbfe] p-3"><span className="leading-4">{label}</span><b className="whitespace-nowrap text-[11px] leading-4 text-[#46516c]">{typeof value === "number" ? `${value} questions` : value}</b></div>)}</div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {done ? <span className="rounded-xl bg-[#ddf6ed] px-4 py-2.5 text-sm font-bold text-[#2c967b]"><Check size={15} className="mr-1 inline" />You have taken this contest</span> : registered ? <>
            <button disabled={!live} onClick={() => startContest(upcoming)} className={primary}>{live ? "Enter contest" : "Enter when contest opens"}</button>
            {!live && <button onClick={() => setRegistered(false)} className="text-xs font-bold text-[#8994aa] hover:text-[#bd4a5a]">Cancel registration</button>}
          </> : <button onClick={() => setRegistered(true)} className={primary}>Register for the contest</button>}
        </div>
        {registered && !done && <p className="mt-3 text-xs font-bold text-[#2c967b]">Registration confirmed. You can enter when the contest opens.</p>}
      </Card>
      <Card>
        <p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">YOUR CONTEST STATS</p>
        <div className="mt-4 grid grid-cols-3 gap-3">{[["Attempted", stats.count], ["Best score", stats.best ?? "–"], ["Avg accuracy", stats.accuracy === null ? "–" : `${stats.accuracy}%`]].map(([label, value]) => <div key={label} className="rounded-xl bg-[#fafbfe] p-3"><strong className="block text-xl text-[#202a45]">{value}</strong><small className="text-[10px] font-semibold text-[#8994aa]">{label}</small></div>)}</div>
        <p className="mt-4 text-[11px] leading-5 text-[#8994aa]">Rank and percentile are shown once other students have taken the same contest. Your attempts are stored in this browser.</p>
        <p className="mt-4 text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">HOW IT WORKS</p>
        <ol className="mt-2 space-y-1.5 text-xs leading-5 text-[#73809b]"><li>1. Register before the contest opens.</li><li>2. Enter during the window. The clock runs for everyone.</li><li>3. Answer, mark for review, and submit. Time-up submits automatically.</li><li>4. Review solutions. Wrong answers go to your mistake book.</li></ol>
      </Card>
    </div>

    <Card>
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">PAST WEEKLY CONTESTS</p><h2 className="mt-1 text-lg font-extrabold text-[#27314c]">Attempt previous contests virtually</h2><p className="mt-2 text-sm text-[#73809b]">Take an earlier contest against the clock, any time, or revisit its questions.</p></div><BookOpen className="shrink-0 text-[#7564ed]" size={20} /></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{past.map((contest) => { const best = history.filter((item) => item.contestId === contest.id).reduce((top, item) => Math.max(top, item.score), null); return <div key={contest.id} className="rounded-xl border border-[#e4e8f1] bg-[#fafbfe] p-4"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-extrabold text-[#303a55]">{contest.title}</h3>{best !== null && <span className="rounded-full bg-[#ddf6ed] px-2.5 py-0.5 text-[10px] font-extrabold text-[#2c967b]">Best {best}</span>}</div><p className="mt-2 text-xs text-[#8994aa]">{contest.questions.length} questions · {contest.minutes} min · Topics: {contest.topics}</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => startContest(contest)} className={`${primary} !px-3 !py-2 text-xs`}>{best === null ? "Start virtual contest" : "Retake"}</button><button onClick={() => setOpenSolutions(openSolutions === contest.id ? null : contest.id)} className={`${soft} !px-3 !py-2 text-xs`}>{openSolutions === contest.id ? "Hide questions" : "View questions"}</button></div></div>; })}</div>
      {openSolutions && <div className="mt-4 rounded-xl border border-[#dcd8fb] bg-[#f7f5ff] p-4"><p className="text-[10px] font-extrabold tracking-[.18em] text-[#7564ed]">QUESTION REVIEW</p><h3 className="mt-1 text-sm font-extrabold text-[#303a55]">{contestOf(openSolutions).title}</h3><div className="mt-3 space-y-3">{contestOf(openSolutions).questions.map((question, index) => <div key={question.qid} className="rounded-lg border border-[#e4e8f1] bg-white p-3"><p className="text-xs font-bold text-[#7564ed]">Question {index + 1} · {question.subject}</p><p className="mt-1 text-sm font-semibold leading-6 text-[#46516c]">{question.text}</p><p className="mt-1 text-xs text-[#2c967b]">Answer: {question.options[question.answer]}</p></div>)}</div></div>}
    </Card>

    <Card>
      <p className="text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">YOUR CONTEST HISTORY</p>
      {history.length ? <div className="mt-4 divide-y divide-[#edf0f5]">{history.slice(0, 8).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"><div className="min-w-0"><p className="text-sm font-bold text-[#303a55]">{item.title}{item.virtual && <span className="ml-2 rounded-full bg-[#f0edff] px-2 py-0.5 text-[10px] font-extrabold text-[#6958d2]">VIRTUAL</span>}</p><p className="mt-1 text-xs text-[#8994aa]">{new Date(item.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {item.correct} correct · {item.accuracy}% accuracy · {clock(item.timeTaken)}</p></div><div className="flex items-center gap-3"><strong className="text-lg text-[#202a45]">{item.score}</strong><button onClick={() => setResultId(item.id)} className="text-xs font-extrabold text-[#6958d2]">View result</button></div></div>)}</div> : <p className="mt-3 text-sm text-[#73809b]">No contests attempted yet. Try a virtual contest above to see how it feels.</p>}
    </Card>
  </div>;
}
