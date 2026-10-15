"use client";

import { useMemo, useState } from "react";
import { Check, ClipboardList } from "lucide-react";
import { MARKS, clock } from "@/lib/contest";
import { getMockTests } from "@/lib/mock";
import { useTestRunner } from "@/components/useTestRunner";
import TestRoom, { Card, primary, soft } from "@/components/TestRoom";
import TestResult from "@/components/TestResult";
import ExamDeviceNotice from "@/components/ExamDeviceNotice";
import { isPhoneDevice } from "@/lib/exam-device";

// How often to sit a full mock, based on how close the exam is.
function schedule(daysLeft) {
  if (daysLeft <= 30) return { cadence: "Every 3 days", tip: "The exam is close. Sit a full mock every 3 days and clear your mistake book after each one." };
  if (daysLeft <= 90) return { cadence: "Once a week", tip: "Take one full mock a week, then spend a day on the chapters it showed as weak." };
  return { cadence: "Once every 2 weeks", tip: "There is plenty of time. Build chapters first and use a mock every two weeks to check progress." };
}

export default function MockTests({ daysLeft, onAddMistakes, onFinish, onReason, onExit }) {
  const tests = useMemo(() => getMockTests(), []);
  const runner = useTestRunner({ activeKey: "jee-mock-active", historyKey: "jee-mock-history", contests: tests, onAddMistakes, onFinish });
  const { now, history, active, resultId, setResultId, contestOf } = runner;
  const [deviceBlocked, setDeviceBlocked] = useState(false);

  const startTest = (test) => {
    if (isPhoneDevice()) {
      setDeviceBlocked(true);
      return;
    }
    runner.start(test, Date.now() + test.minutes * 60000);
  };

  if (deviceBlocked) return <ExamDeviceNotice onBack={() => setDeviceBlocked(false)} />;

  if (active) {
    const test = contestOf(active.contestId);
    return <TestRoom eyebrow="JEE MAIN · FULL SYLLABUS" title={`${test.title} in progress`} noun="test" questions={test.questions} session={active} now={now} onUpdate={runner.updateActive} onSubmit={runner.submit} onExit={() => { runner.exit(); onExit(); }} />;
  }

  const entry = history.find((item) => item.id === resultId);
  if (entry) return <TestResult eyebrow="MOCK TEST SOLUTIONS" entry={entry} questions={contestOf(entry.contestId).questions} backLabel="Back to mock tests" onBack={() => setResultId(null)} onReason={onReason} />;

  const attemptsOf = (id) => history.filter((item) => item.contestId === id);
  const next = tests.find((test) => !attemptsOf(test.id).length) || tests.reduce((oldest, test) => (attemptsOf(test.id)[0].at < attemptsOf(oldest.id)[0].at ? test : oldest));
  const plan = schedule(daysLeft);

  // Weakest chapters across every attempt (latest attempt of each test only).
  const chapterRows = Object.values(tests.flatMap((test) => { const latest = attemptsOf(test.id)[0]; return latest ? test.questions.map((question, index) => ({ question, given: latest.answers[index] })) : []; }).reduce((map, { question, given }) => {
    const row = map[question.chapter] || (map[question.chapter] = { chapter: question.chapter, subject: question.subject, correct: 0, total: 0 });
    row.total += 1;
    if (given === question.answer) row.correct += 1;
    return map;
  }, {})).sort((a, b) => a.correct / a.total - b.correct / b.total);
  const trend = [...history].reverse().slice(-6);
  const maxScore = tests[0].questions.length * MARKS.correct;

  return <div className="space-y-5">
    <div><p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">PRACTISE UNDER PRESSURE</p><h1 className="text-3xl font-extrabold text-[#18223c]">Mock tests</h1><p className="mt-2 text-sm text-[#73809b]">Choose a test, review its solutions after completion, or retake it whenever you need.</p></div>

    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card className="border-[#dcd8fb] bg-gradient-to-r from-[#f4f1ff] to-white">
        <p className="text-[10px] font-extrabold tracking-[.16em] text-[#8175bd]">RECOMMENDED NEXT</p>
        <h2 className="mt-2 text-xl font-extrabold text-[#29274e]">{next.title} · {next.tag}</h2>
        <p className="mt-1 text-sm text-[#707b94]">{attemptsOf(next.id).length ? "Retake it and try to beat your best score." : "You haven't taken this one yet."} {next.blurb}</p>
        <button onClick={() => startTest(next)} className={`${primary} mt-4`}>{attemptsOf(next.id).length ? "Retake exam" : "Start exam"}</button>
      </Card>
      <Card>
        <p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">YOUR MOCK SCHEDULE</p>
        <h2 className="mt-2 text-lg font-extrabold text-[#27314c]">{plan.cadence}</h2>
        <p className="mt-1 text-xs leading-5 text-[#73809b]">{daysLeft} days to your exam. {plan.tip}</p>
      </Card>
    </div>

    <Card>
      <p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">TEST LIBRARY</p>
      <h2 className="mt-2 text-lg font-extrabold text-[#27314c]">Available mock tests</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">{tests.map((test, index) => {
        const attempts = attemptsOf(test.id);
        const best = attempts.length ? Math.max(...attempts.map((item) => item.score)) : null;
        const resuming = active?.contestId === test.id;
        return <article key={test.id} className="rounded-2xl border border-[#e4e8f1] bg-[#fafbfe] p-4">
          <div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eeeaff] text-sm font-extrabold text-[#6757d1]">{index + 1}</span>{attempts.length > 0 && <span title="Completed" aria-label={`${test.title} completed`} className="grid h-7 w-7 place-items-center rounded-full bg-[#ddf6ed] text-[#2c967b]"><Check size={16} /></span>}</div>
          <h3 className="mt-4 text-sm font-extrabold text-[#303a55]">{test.title}</h3>
          <p className="mt-1 text-[11px] font-bold text-[#7564ed]">{test.tag}</p>
          <p className="mt-2 text-xs text-[#8590a7]">{test.questions.length} questions - {test.minutes} minutes</p>
          <p className="mt-1 text-xs text-[#8590a7]">{attempts.length ? `Best ${best}/${maxScore} · ${attempts.length} attempt${attempts.length > 1 ? "s" : ""}` : "Not attempted yet"}</p>
          <div className="mt-5 flex flex-wrap gap-2">{attempts.length > 0 && <button onClick={() => setResultId(attempts[0].id)} className="rounded-lg px-2 py-2 text-xs font-extrabold text-[#6958d2] hover:bg-[#f0edff]">View solutions</button>}<button onClick={() => startTest(test)} className={`${primary} text-xs`}>{attempts.length ? "Retake exam" : "Start exam"}</button></div>
        </article>;
      })}</div>
    </Card>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <div className="flex items-center justify-between"><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">SCORE TREND</p><ClipboardList size={16} className="text-[#7564ed]" /></div>
        {trend.length ? <div className="mt-4 flex h-32 items-end gap-3">{trend.map((item) => <div key={item.id} className="flex flex-1 flex-col items-center gap-1"><span className="text-[10px] font-bold text-[#46516c]">{item.score}</span><div className="w-full rounded-t-lg bg-[#7564ed]" style={{ height: `${Math.max(4, (Math.max(0, item.score) / maxScore) * 100)}%` }} /><span className="text-[9px] text-[#8994aa]">{item.title.replace("Mock test ", "T")}</span></div>)}</div> : <p className="mt-3 text-sm text-[#73809b]">Take your first mock to start your score trend.</p>}
      </Card>
      <Card>
        <p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">CHAPTERS TO REVISE</p>
        {chapterRows.length ? <div className="mt-4 space-y-3">{chapterRows.slice(0, 4).map((row) => <div key={row.chapter}><div className="flex justify-between gap-3 text-sm"><span className="font-bold text-[#46516c]">{row.chapter} <small className="font-normal text-[#8994aa]">{row.subject}</small></span><span className="text-xs text-[#73809b]">{Math.round((row.correct / row.total) * 100)}%</span></div><div className="mt-2 h-1.5 rounded-full bg-[#edf0f6]"><div className={`h-full rounded-full ${row.correct / row.total >= 0.6 ? "bg-[#4bbd99]" : "bg-[#e0788a]"}`} style={{ width: `${(row.correct / row.total) * 100}%` }} /></div></div>)}</div> : <p className="mt-3 text-sm text-[#73809b]">Your weakest chapters will appear here after a mock test.</p>}
      </Card>
    </div>

    <Card>
      <p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">BEFORE YOU START</p>
      <ul className="mt-3 grid gap-2 text-xs leading-5 text-[#73809b] sm:grid-cols-2"><li>+{MARKS.correct} for a correct answer, {MARKS.wrong} for a wrong one, 0 if skipped.</li><li>The timer cannot be paused. Time-up submits your paper automatically.</li><li>Use "Mark for review" to return to doubtful questions from the palette.</li><li>Wrong answers go to your mistake book. Pick the reason for each one on the result page.</li></ul>
      {history.length > 0 && <div className="mt-5 divide-y divide-[#edf0f5] border-t border-[#edf0f5]">{history.slice(0, 5).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold text-[#303a55]">{item.title}</p><p className="mt-1 text-xs text-[#8994aa]">{new Date(item.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {item.accuracy}% accuracy · {clock(item.timeTaken)}</p></div><div className="flex items-center gap-3"><strong className="text-lg text-[#202a45]">{item.score}</strong><button onClick={() => setResultId(item.id)} className={`${soft} !px-3 !py-1.5 text-xs`}>View result</button></div></div>)}</div>}
    </Card>
  </div>;
}
