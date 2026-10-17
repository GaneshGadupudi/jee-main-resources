"use client";

import { useState } from "react";

// One published PYQ. The correct answer is NOT in `question` - it only arrives from /api/pyq/attempt after the student answers.
export default function PyqQuestionCard({ question, index }) {
  const [draft, setDraft] = useState(question.type === "NUMERIC" ? "" : []);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(answer) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/pyq/attempt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: question.id, answer }) });
      const data = await response.json();
      if (!response.ok) setError(data.error || "Unable to record your answer.");
      else setResult({ ...data, answer });
    } catch {
      setError("Unable to record your answer.");
    } finally {
      setBusy(false);
    }
  }

  const chosen = result ? [].concat(result.answer).map(Number) : draft;
  const pick = (optionIndex) => question.type === "MCQ" ? submit(optionIndex) : setDraft((current) => current.includes(optionIndex) ? current.filter((x) => x !== optionIndex) : [...current, optionIndex]);

  return <section className="rounded-2xl border border-[#e4e8f1] bg-white p-5">
    <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold tracking-wide text-[#8994aa]"><span className="rounded-full bg-[#f0edff] px-2.5 py-1 text-[#6958d2]">{question.subject}</span><span>{question.chapter} · {question.topic}</span><span className="ml-auto">{question.exam} · {question.year}{question.shift ? ` · ${question.shift}` : ""}</span></div>
    <p className="mt-4 whitespace-pre-wrap text-sm font-bold leading-6 text-[#27314c]">{index + 1}. {question.text}</p>
    {question.imageUrl && <img src={question.imageUrl} alt="Question figure" className="mt-3 max-h-64 rounded-lg border border-[#e4e8f1]" />}
    {question.type === "NUMERIC"
      ? <div className="mt-4 flex items-center gap-2">
        <input type="number" step="any" disabled={!!result} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Enter your answer" className="w-48 rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm" />
        {!result && <button type="button" disabled={busy || draft === ""} onClick={() => submit(Number(draft))} className="rounded-xl bg-[#6366f1] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">Submit</button>}
      </div>
      : <div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => {
        const isCorrect = result?.correct.includes(optionIndex);
        const isWrongPick = result && !isCorrect && chosen.includes(optionIndex);
        const tone = isCorrect ? "border-[#66b99d] bg-[#e9f8f1] text-[#287e65]" : isWrongPick ? "border-[#dc8792] bg-[#fff0f2] text-[#bd4a5a]" : !result && chosen.includes(optionIndex) ? "border-[#a89bea] bg-[#f0edff] text-[#46516b]" : "border-[#e4e8f1] text-[#46516b] hover:border-[#a89bea] hover:bg-[#faf9ff]";
        return <button key={optionIndex} type="button" disabled={!!result || busy} onClick={() => pick(optionIndex)} className={`rounded-xl border p-3 text-left text-xs font-semibold transition ${tone}`}><span className="mr-2 text-[#8994aa]">{String.fromCharCode(65 + optionIndex)}.</span>{option}</button>;
      })}</div>}
    {question.type === "MULTI" && !result && <button type="button" disabled={busy || !draft.length} onClick={() => submit(draft)} className="mt-3 rounded-xl bg-[#6366f1] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Submit (more than one option may be correct)</button>}
    {error && <p className="mt-3 text-xs text-[#bd4a5a]">{error}</p>}
    {result && <p className={`mt-4 rounded-xl p-3 text-xs leading-5 ${result.isCorrect ? "bg-[#e9f8f1] text-[#287e65]" : "bg-[#fff0f2] text-[#bd4a5a]"}`}><strong>{result.isCorrect ? "Correct. " : "Not quite. "}</strong>{question.type === "NUMERIC" && !result.isCorrect ? `The answer is ${result.numericAnswer}. ` : ""}{result.explanation}</p>}
  </section>;
}
