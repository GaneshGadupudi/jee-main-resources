"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { MARKS, SUBJECTS, clock, scoreContest } from "@/lib/contest";
import { Card } from "@/components/TestRoom";

const reasons = ["Calculation mistake", "Concept not clear", "Read the question incorrectly", "Guess"];

// Score card, subject and chapter breakdown, time analysis and a full solution review for one attempt.
export default function TestResult({ eyebrow, entry, questions, backLabel, onBack, onReason, note }) {
  const [picked, setPicked] = useState({});
  const stats = scoreContest(questions, entry.answers);
  const maxScore = questions.length * MARKS.correct;
  const chapters = Object.values(questions.reduce((map, question, index) => {
    const row = map[question.chapter] || (map[question.chapter] = { chapter: question.chapter, correct: 0, total: 0 });
    row.total += 1;
    if (entry.answers[index] === question.answer) row.correct += 1;
    return map;
  }, {}));
  const spent = entry.spent || [];
  const subjectTime = (subject) => questions.reduce((sum, question, index) => sum + (question.subject === subject ? spent[index] || 0 : 0), 0);
  const slowest = spent.length ? spent.reduce((best, seconds, index) => (seconds > best.seconds ? { index, seconds } : best), { index: 0, seconds: 0 }) : null;

  return <div className="space-y-5">
    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-[#6958d2]"><ChevronLeft size={16} />{backLabel}</button>
    <div><p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">{eyebrow}</p><h1 className="text-3xl font-extrabold text-[#18223c]">{entry.title}</h1></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[["Score", `${entry.score} / ${maxScore}`], ["Correct", entry.correct], ["Wrong", entry.wrong], ["Accuracy", `${entry.accuracy}%`], ["Time taken", clock(entry.timeTaken)]].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#e4e8f1] bg-white p-4"><small className="block text-xs font-semibold text-[#7b879e]">{label}</small><strong className="mt-1 block text-2xl text-[#202a45]">{value}</strong></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">SUBJECT BREAKDOWN</p><div className="mt-4 space-y-4">{SUBJECTS.map((subject) => { const row = stats.bySubject[subject]; const seconds = subjectTime(subject); return <div key={subject}><div className="flex flex-wrap justify-between gap-x-3 text-sm"><span className="font-bold text-[#46516c]">{subject}</span><span className="text-xs text-[#73809b]">{row.correct} correct · {row.wrong} wrong · {row.total - row.correct - row.wrong} skipped{seconds ? ` · ${clock(seconds * 1000)}` : ""}</span></div><div className="mt-2 h-1.5 rounded-full bg-[#edf0f6]"><div className="h-full rounded-full bg-[#7564ed]" style={{ width: `${row.total ? (row.correct / row.total) * 100 : 0}%` }} /></div></div>; })}</div></Card>
      <Card><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">CHAPTER-WISE</p><div className="mt-4 space-y-3">{chapters.map((row) => <div key={row.chapter}><div className="flex justify-between gap-3 text-sm"><span className="font-bold text-[#46516c]">{row.chapter}</span><span className="text-xs text-[#73809b]">{row.correct}/{row.total}</span></div><div className="mt-2 h-1.5 rounded-full bg-[#edf0f6]"><div className={`h-full rounded-full ${row.correct / row.total >= 0.6 ? "bg-[#4bbd99]" : "bg-[#e0788a]"}`} style={{ width: `${(row.correct / row.total) * 100}%` }} /></div></div>)}</div>{slowest && slowest.seconds > 0 && <p className="mt-4 text-xs text-[#8994aa]">Slowest question: Q{slowest.index + 1} ({clock(slowest.seconds * 1000)}).</p>}</Card>
    </div>
    <p className="text-xs text-[#8994aa]">{note || "Wrong answers were added to your mistake book."}</p>
    <Card><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">QUESTION REVIEW</p><div className="mt-4 space-y-3">{questions.map((question, index) => { const given = entry.answers[index]; const right = given === question.answer; return <div key={question.qid} className="rounded-xl border border-[#e4e8f1] bg-[#fafbfe] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-[#7564ed]">Q{index + 1} · {question.subject} · {question.chapter}{spent[index] ? ` · ${clock(spent[index] * 1000)}` : ""}</p><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${given === null ? "bg-[#f1f3f8] text-[#8994aa]" : right ? "bg-[#ddf6ed] text-[#2c967b]" : "bg-[#ffe8eb] text-[#c7586d]"}`}>{given === null ? "SKIPPED" : right ? `+${MARKS.correct}` : MARKS.wrong}</span></div><p className="mt-2 text-sm font-semibold leading-6 text-[#46516c]">{question.text}</p>{given !== null && !right && <p className="mt-2 text-xs text-[#c7586d]">Your answer: {question.options[given]}</p>}<p className="mt-1 text-xs text-[#2c967b]">Correct answer: {question.options[question.answer]}</p><p className="mt-2 text-xs leading-5 text-[#73809b]">{question.explanation}</p>{given !== null && !right && <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-[#59647d]">Why was it wrong?</span>{reasons.map((reason) => <button key={reason} onClick={() => { setPicked({ ...picked, [question.qid]: reason }); onReason(question.text, reason); }} className={`rounded-full border px-3 py-1 text-xs font-bold ${picked[question.qid] === reason ? "border-[#7564ed] bg-[#7564ed] text-white" : "border-[#dfe3ef] bg-white text-[#59647d] hover:bg-[#f3f1ff]"}`}>{reason}</button>)}</div>}</div>; })}</div></Card>
  </div>;
}
