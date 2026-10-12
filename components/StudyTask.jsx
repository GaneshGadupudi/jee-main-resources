"use client";

import { useState } from "react";
import { ArrowLeft, BookOpen, Check, ChevronRight, Sigma } from "lucide-react";
import { chapterContent } from "@/lib/chapters";
import { weightLabel } from "@/lib/plan";

const card = "rounded-2xl border border-[#e4e8f1] bg-white p-5";
const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#7564ed] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(117,100,237,.2)] hover:bg-[#6655df] disabled:cursor-not-allowed disabled:opacity-40";
const ghost = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#dfe3ef] bg-white px-4 py-2.5 text-sm font-bold text-[#34405b] hover:bg-[#f3f1ff]";

const reasons = ["Calculation mistake", "Concept not clear", "Read the question incorrectly", "Guess"];

export default function StudyTask({ task, nextTitle, onBack, onAnswer, onWrong, onReason, onComplete }) {
  const [reason, setReason] = useState("");
  const content = chapterContent[task.chapterId];
  const questions = content?.questions || [];
  const [stage, setStage] = useState("learn");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [correct, setCorrect] = useState(0);

  const question = questions[index];
  const choose = (option) => {
    if (picked !== null) return;
    setPicked(option);
    onAnswer({ subject: task.subject, chapter: task.chapter, text: question.text, correct: option === question.answer });
    if (option === question.answer) setCorrect((count) => count + 1);
    else onWrong({ subject: task.subject, chapter: task.chapter, text: question.text, options: question.options, answer: question.answer, reason: "" });
  };
  const next = () => {
    setReason("");
    if (index < questions.length - 1) { setIndex(index + 1); setPicked(null); } else setStage("done");
  };

  const header = <div className="flex flex-wrap items-center justify-between gap-3">
    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-[#6958d2]"><ArrowLeft size={16} /> Back to today&apos;s plan</button>
    <div className="flex gap-1.5 text-[10px] font-extrabold tracking-wide">{[["learn", "1 LEARN"], ["practice", "2 PRACTICE"], ["done", "3 DONE"]].map(([key, label]) => <span key={key} className={`rounded-full px-3 py-1 ${stage === key ? "bg-[#7564ed] text-white" : "bg-[#f0edff] text-[#8d83c9]"}`}>{label}</span>)}</div>
  </div>;

  const title = <div>
    <p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">{task.subject.toUpperCase()} · {weightLabel(task.weight).toUpperCase()}</p>
    <h1 className="text-3xl font-extrabold text-[#18223c]">{task.chapter}</h1>
  </div>;

  if (stage === "learn") return <div className="space-y-5">{header}{title}
    {content ? <>
      <section className={card}><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">OVERVIEW</p><p className="mt-3 text-sm leading-7 text-[#46516c]">{content.overview}</p></section>
      <section className={card}><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">IMPORTANT CONCEPTS</p><ul className="mt-3 space-y-3">{content.concepts.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-[#46516c]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7564ed]" />{item}</li>)}</ul></section>
      <section className={card}><div className="flex items-center gap-2"><Sigma size={16} className="text-[#7564ed]" /><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">KEY FORMULAS</p></div><div className="mt-3 divide-y divide-[#edf0f5]">{content.formulas.map(([name, formula]) => <div key={name} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"><span className="text-xs font-bold text-[#73809b]">{name}</span><code className="rounded-lg bg-[#f6f5ff] px-3 py-1.5 text-sm font-semibold text-[#34405b]">{formula}</code></div>)}</div></section>
    </> : <section className={card}><BookOpen className="text-[#7564ed]" /><h2 className="mt-3 text-lg font-extrabold text-[#27314c]">Overview coming soon</h2><p className="mt-2 text-sm leading-6 text-[#73809b]">The summary, concepts and formulas for this chapter are being added. Use the handwritten notes for now.</p></section>}
    {task.file && <a href={`/Notes/${encodeURIComponent(task.file)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-[#6958d2]"><BookOpen size={16} /> Open full handwritten notes (PDF)</a>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e8f1] pt-5"><span className="text-xs text-[#8994aa]">Short on time? Jump straight to the questions.</span><button onClick={() => setStage("practice")} className={primary}>Skip to practice <ChevronRight size={16} /></button></div>
  </div>;

  if (stage === "practice") {
    if (!question) return <div className="space-y-5">{header}{title}<section className={card}><h2 className="text-lg font-extrabold text-[#27314c]">Practice questions coming soon</h2><p className="mt-2 text-sm leading-6 text-[#73809b]">Questions for this chapter are being added. You can mark this task complete for now.</p><button onClick={() => onComplete({ correct: 0, total: 0 })} className={`${primary} mt-5`}>Complete task{nextTitle ? " & go to next" : ""} <ChevronRight size={16} /></button></section></div>;
    return <div className="space-y-5">{header}{title}
      <section className={card}>
        <div className="flex items-center justify-between text-xs"><span className="font-extrabold text-[#7564ed]">{task.chapter.toUpperCase()}</span><span className="text-[#8994aa]">Question {index + 1} of {questions.length}</span></div>
        <h2 className="mt-4 text-xl font-extrabold leading-8 text-[#25304b]">{question.text}</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">{question.options.map((option, i) => { const reveal = picked !== null; const state = !reveal ? "border-[#e4e8f1] bg-[#fafbfe] hover:border-[#bcb2f0]" : i === question.answer ? "border-[#9ad7c9] bg-[#e4f8f5]" : i === picked ? "border-[#efc3c3] bg-[#fff1f1]" : "border-[#e4e8f1] bg-[#fafbfe] opacity-60"; return <button key={option} onClick={() => choose(i)} disabled={reveal} className={`min-h-14 rounded-xl border p-4 text-left text-sm font-semibold leading-6 transition ${state}`}>{String.fromCharCode(65 + i)}. {option}</button>; })}</div>
        {picked !== null && <div className={`mt-5 rounded-xl p-4 text-sm leading-6 ${picked === question.answer ? "bg-[#e4f8f5] text-[#247b70]" : "bg-[#fff1f1] text-[#a34e5c]"}`}><strong>{picked === question.answer ? "Correct!" : "Not quite. Added to your mistake book."}</strong> {question.explanation}</div>}
        {picked !== null && picked !== question.answer && <div className="mt-4 rounded-xl border border-[#efc3c3] bg-white p-4"><p className="text-sm font-bold text-[#59647d]">Why was it wrong?</p><div className="mt-3 flex flex-wrap gap-2">{reasons.map((item) => <button key={item} onClick={() => { setReason(item); onReason(question.text, item); }} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${reason === item ? "border-[#7564ed] bg-[#7564ed] text-white" : "border-[#dfe3ef] bg-white text-[#59647d] hover:bg-[#f3f1ff]"}`}>{item}</button>)}</div></div>}
        <div className="mt-6 flex items-center justify-between border-t border-[#edf0f5] pt-5"><span className="text-xs text-[#8994aa]">{picked === null ? "Choose an answer to continue" : picked !== question.answer && !reason ? "Tell us why it was wrong to continue" : "Read the explanation, then continue"}</span><button disabled={picked === null || (picked !== question.answer && !reason)} onClick={next} className={primary}>{index === questions.length - 1 ? "See result" : "Next question"} <ChevronRight size={16} /></button></div>
      </section>
    </div>;
  }

  const percent = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  return <div className="space-y-5">{header}{title}
    <section className={`${card} max-w-xl`}><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#ddf6ed] text-[#2c967b]"><Check /></span><h2 className="mt-4 text-2xl font-extrabold text-[#27314c]">{correct} of {questions.length} correct</h2><p className="mt-2 text-sm leading-6 text-[#73809b]">{percent >= 80 ? "Strong grasp of this chapter. Keep the formulas fresh with a quick revision later this week." : percent >= 50 ? "Good start. The questions you missed are saved in your mistake book for revision." : "This chapter needs another pass. Re-read the concepts and formulas, then revisit the mistakes saved in your mistake book."}</p><div className="mt-5 flex flex-wrap gap-3"><button onClick={() => onComplete({ correct, total: questions.length })} className={primary}>Complete task{nextTitle ? " & go to next" : ""} <ChevronRight size={16} /></button><button onClick={() => { setStage("learn"); setIndex(0); setPicked(null); setCorrect(0); }} className={ghost}>Review the concepts again</button></div>{nextTitle && <p className="mt-4 text-xs text-[#8994aa]">Next up: {nextTitle}</p>}</section>
  </div>;
}
