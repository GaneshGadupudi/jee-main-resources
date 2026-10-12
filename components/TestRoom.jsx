"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Flag } from "lucide-react";
import { MARKS, SUBJECTS, clock, trackTime } from "@/lib/contest";

const btn = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40";
export const primary = `${btn} bg-[#7564ed] text-white shadow-[0_8px_20px_rgba(117,100,237,.2)] hover:bg-[#6655df]`;
export const ghost = `${btn} border border-[#dfe3ef] bg-white text-[#34405b] hover:bg-[#f3f1ff]`;
export const soft = `${btn} bg-[#f0edff] text-[#5e4bc1] hover:bg-[#e5e0ff]`;

export function Card({ children, className = "" }) {
  return <section className={`rounded-2xl border border-[#e4e8f1] bg-white p-5 ${className}`}>{children}</section>;
}

// Timed question room with subject tabs, question palette, mark for review and confirm-to-submit.
export default function TestRoom({ eyebrow, title, noun = "test", questions, session, now, onUpdate, onSubmit, onExit }) {
  const [confirming, setConfirming] = useState(false);
  const [warningNumber, setWarningNumber] = useState(null);
  const [exitRequested, setExitRequested] = useState(false);
  const warningCount = useRef(0);
  const q = questions[session.current];
  const remaining = session.endsAt - now;
  const picked = session.answers[session.current];
  const answeredCount = Object.keys(session.answers).length;
  const go = (index) => onUpdate({ ...trackTime(session), current: Math.min(questions.length - 1, Math.max(0, index)) });
  const choose = (option) => onUpdate({ ...session, answers: { ...session.answers, [session.current]: option } });
  const clear = () => { const answers = { ...session.answers }; delete answers[session.current]; onUpdate({ ...session, answers }); };
  const toggleMark = () => onUpdate({ ...session, marked: session.marked.includes(session.current) ? session.marked.filter((i) => i !== session.current) : [...session.marked, session.current] });
  const status = (index) => index === session.current ? "border-[#7564ed] bg-[#f0edff] text-[#5e4bc1] ring-2 ring-[#cfc7fb]" : session.marked.includes(index) ? "border-[#f0d9a6] bg-[#fff3dc] text-[#b67821]" : session.answers[index] !== undefined ? "border-[#9ad7c9] bg-[#ddf6ed] text-[#2c967b]" : "border-[#e4e8f1] bg-[#fafbfe] text-[#73809b]";

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setExitRequested(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      const next = warningCount.current + 1;
      warningCount.current = next;
      setWarningNumber(next);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onExit, onSubmit, session]);

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f7f8fc] p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-7xl space-y-5">
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e4e8f1] bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-bold text-[#59647d]">Exam mode is active. Press <kbd className="rounded border border-[#dfe3ef] bg-[#fafbfe] px-1.5 py-0.5 font-mono text-[11px]">Esc</kbd> to return to the dashboard.</p>
      <button onClick={() => setExitRequested(true)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#6958d2] hover:bg-[#f0edff]">Exit exam</button>
    </div>
    <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">{eyebrow}</p><h1 className="text-2xl font-extrabold text-[#18223c]">{title}</h1></div>
      <span className={`rounded-xl px-4 py-2 text-sm font-extrabold tabular-nums ${remaining < 300000 ? "bg-[#fff1f1] text-[#bd4a5a]" : "bg-[#fff2e4] text-[#c17a27]"}`}><Clock3 size={16} className="mr-2 inline" />{clock(remaining)}</span>
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
      <Card>
        <div className="flex flex-wrap gap-2">{SUBJECTS.map((subject) => { const first = questions.findIndex((item) => item.subject === subject); return <button key={subject} onClick={() => go(first)} className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${q.subject === subject ? "bg-[#7564ed] text-white" : "bg-[#f0edff] text-[#8d83c9]"}`}>{subject}</button>; })}</div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-extrabold text-[#7564ed]">Q{session.current + 1} of {questions.length} · {q.chapter}</span><span className="text-[#8994aa]">+{MARKS.correct} correct · {MARKS.wrong} wrong</span></div>
        <h2 className="mt-3 text-xl font-extrabold leading-8 text-[#25304b]">{q.text}</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">{q.options.map((option, index) => <button key={option} onClick={() => choose(index)} className={`min-h-14 rounded-xl border p-4 text-left text-sm font-semibold leading-6 transition ${picked === index ? "border-[#8273df] bg-[#f1efff]" : "border-[#e4e8f1] bg-[#fafbfe] hover:border-[#bcb2f0]"}`}>{String.fromCharCode(65 + index)}. {option}</button>)}</div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f5] pt-5">
          <div className="flex flex-wrap gap-2"><button onClick={toggleMark} className={ghost}><Flag size={15} />{session.marked.includes(session.current) ? "Unmark" : "Mark for review"}</button><button onClick={clear} disabled={picked === undefined} className={ghost}>Clear</button></div>
          <div className="flex gap-2"><button onClick={() => go(session.current - 1)} disabled={session.current === 0} className={ghost}><ChevronLeft size={16} />Previous</button><button onClick={() => go(session.current + 1)} disabled={session.current === questions.length - 1} className={primary}>Next<ChevronRight size={16} /></button></div>
        </div>
      </Card>
      <Card className="h-fit">
        <p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">QUESTION PALETTE</p>
        <div className="mt-4 grid grid-cols-5 gap-2">{questions.map((_, index) => <button key={index} onClick={() => go(index)} aria-label={`Question ${index + 1}`} className={`grid h-10 place-items-center rounded-lg border text-xs font-extrabold ${status(index)}`}>{index + 1}</button>)}</div>
        <div className="mt-4 space-y-1.5 text-[11px] text-[#73809b]"><p><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[#9ad7c9]" />Answered ({answeredCount})</p><p><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[#f0d9a6]" />Marked for review ({session.marked.length})</p><p><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[#e4e8f1]" />Not answered ({questions.length - answeredCount})</p></div>
        {confirming ? <div className="mt-5 rounded-xl border border-[#efc3c3] bg-[#fff8f8] p-3"><p className="text-xs font-bold text-[#59647d]">Submit now? {questions.length - answeredCount} unanswered{session.marked.length ? `, ${session.marked.length} marked for review` : ""}.</p><div className="mt-3 flex gap-2"><button onClick={() => onSubmit(session)} className={`${primary} flex-1`}>Submit</button><button onClick={() => setConfirming(false)} className={`${ghost} flex-1`}>Cancel</button></div></div> : <button onClick={() => setConfirming(true)} className={`${primary} mt-5 w-full`}>Submit {noun}</button>}
      </Card>
    </div>
    </div>
    </div>
    {(warningNumber !== null || exitRequested) && <div className="fixed inset-0 z-10 grid place-items-center bg-[#18223c]/45 p-6" role="presentation">
      <div role="alertdialog" aria-modal="true" aria-labelledby="tab-warning-title" className="w-full max-w-md rounded-2xl border border-[#e4e8f1] bg-white p-7 text-center shadow-2xl">
        <p className="text-[10px] font-extrabold tracking-[.18em] text-[#bd4a5a]">{exitRequested ? "LEAVING EXAM" : "EXAM SECURITY ALERT"}</p>
        <h2 id="tab-warning-title" className="mt-2 text-xl font-extrabold text-[#18223c]">
          {exitRequested ? "Leave this exam?" : warningNumber >= 3 ? "Your exam has been submitted" : "Tab switching detected"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#59647d]">
          {exitRequested
            ? "If you leave the exam, your current attempt will be submitted automatically."
            : warningNumber >= 3
            ? "You switched away from the exam 3 times, so this attempt has been submitted."
            : `You switched away from the exam. This is warning ${warningNumber} of 3. Please stay on this page while writing the exam.`}
        </p>
        {exitRequested ? <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button autoFocus onClick={() => setExitRequested(false)} className={ghost}>Continue exam</button>
          <button onClick={() => { onSubmit(session); onExit(); }} className={primary}>Exit and submit</button>
        </div> : <button
          autoFocus
          onClick={() => {
            if (warningNumber >= 3) {
              onSubmit(session);
              onExit();
            } else {
              setWarningNumber(null);
            }
          }}
          className={`${primary} mt-6 w-full`}
        >
          {warningNumber >= 3 ? "OK, return to dashboard" : "OK, continue exam"}
        </button>}
      </div>
    </div>}
  </div>;
}
