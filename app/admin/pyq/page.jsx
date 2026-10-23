"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminHeader from "@/components/AdminHeader";

const STATUSES = ["Draft", "Published", "Rejected"];
const blank = { exam: "JEE Main", year: new Date().getFullYear(), shift: "", sourceQuestionId: "", type: "MCQ", text: "", imageUrl: "", options: ["", "", "", ""], correct: [], numericAnswer: "", explanation: "", sourceFile: "", sourcePage: "", topicId: null };

const field = "mt-1 w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-2.5 text-sm";
const label = "block text-xs font-bold text-[#46516b]";
const btn = "rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50";

export default function AdminPyqPage() {
  const [access, setAccess] = useState("loading");
  const [status, setStatus] = useState("Draft");
  const [data, setData] = useState({ questions: [], counts: {}, taxonomy: [], total: 0 });
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [importText, setImportText] = useState("");

  const load = useCallback(async (nextStatus) => {
    const response = await fetch(`/api/admin/pyq?status=${nextStatus}`);
    if (response.status === 403 || response.status === 401) return setAccess("denied");
    if (!response.ok) return setMessage({ error: true, text: "Unable to load questions." });
    setData(await response.json());
    setAccess("ok");
  }, []);

  useEffect(() => { load(status); }, [status, load]);

  async function call(url, method, body, success) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) setMessage({ error: true, text: [result.error, ...(result.problems || [])].join(" • ") });
      else { setMessage({ text: success(result) }); setEditing(null); await load(status); }
    } catch {
      setMessage({ error: true, text: "Request failed." });
    } finally {
      setBusy(false);
    }
  }

  const topicInfo = (topicId) => {
    for (const s of data.taxonomy) for (const c of s.chapters) for (const t of c.topics) if (t.id === topicId) return { subject: s, chapter: c };
    return {};
  };

  if (access === "loading") return <main className="grid min-h-screen place-items-center bg-[#f7f8fc] text-sm text-[#73809b]">Loading...</main>;
  if (access === "denied") return <main className="grid min-h-screen place-items-center bg-[#f7f8fc] p-6"><section className="max-w-md rounded-2xl border border-[#e4e8f1] bg-white p-8 text-center"><h1 className="text-2xl font-extrabold text-[#18223c]">Admin only</h1><p className="mt-3 text-sm text-[#73809b]">Log in with the admin account to review PYQ questions.</p><Link href="/login" className="mt-6 inline-flex rounded-xl bg-[#6366f1] px-5 py-3 text-sm font-bold text-white">Go to login</Link></section></main>;

  return (
    <div className="min-h-screen bg-[#f7f8fc] antialiased">
      <AdminHeader currentTab="pyq" />
      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">CURRICULUM REVIEW</p>
              <h1 className="text-3xl font-extrabold text-[#18223c]">PYQ review</h1>
              <p className="mt-1 text-sm text-[#73809b]">
                Compare each question with the official NTA paper and answer key before publishing. Students only see Published questions.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className={`${btn} bg-[#6366f1] text-white shadow-sm hover:bg-[#5254db] transition`}
                onClick={() => setEditing({ ...blank })}
              >
                + New question
              </button>
            </div>
          </div>

    <div className="flex gap-2">{STATUSES.map((s) => <button key={s} onClick={() => { setStatus(s); setEditing(null); }} className={`${btn} ${status === s ? "bg-[#18223c] text-white" : "border border-[#dfe5ef] bg-white text-[#46516b]"}`}>{s} ({data.counts[s] || 0})</button>)}</div>

    {message && <p className={`rounded-xl p-3 text-sm ${message.error ? "bg-[#fff0f2] text-[#bd4a5a]" : "bg-[#e9f8f1] text-[#287e65]"}`}>{message.text}</p>}

    {editing && <Editor key={editing.id || "new"} initial={editing} taxonomy={data.taxonomy} topicInfo={topicInfo} busy={busy} onCancel={() => setEditing(null)}
      onSave={(q) => call(q.id ? `/api/admin/pyq/${q.id}` : "/api/admin/pyq", q.id ? "PUT" : "POST", q.id ? { question: q } : { questions: [q] }, (r) => (r.results && r.results[0]?.error) || "Saved as Draft.")}
      onPublish={(q) => call(`/api/admin/pyq/${q.id}`, "POST", { action: "publish" }, () => "Published.")} />}

    <div className="space-y-3">
      {data.questions.map((q) => <article key={q.id} className="rounded-2xl border border-[#e4e8f1] bg-white p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#6958d2]"><span className="rounded-full bg-[#f0edff] px-2.5 py-1">{q.exam} {q.year}{q.shift ? ` · ${q.shift}` : ""}</span><span className="rounded-full bg-[#f0edff] px-2.5 py-1">{q.type}</span>
          <span className="text-[#73809b]">{q.subject ? `${q.subject} › ${q.chapter} › ${q.topic}` : "No topic assigned"}</span>{q.sourceFile && <span className="text-[#73809b]">· {q.sourceFile} p.{q.sourcePage}</span>}</div>
        <p className="mt-3 whitespace-pre-wrap text-sm font-semibold text-[#18223c]">{q.text}</p>
        {q.type === "NUMERIC" ? <p className="mt-2 text-sm text-[#287e65]">Answer: {q.numericAnswer}</p> : <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">{q.options.map((o, i) => <li key={i} className={q.correct.includes(i) ? "font-bold text-[#287e65]" : "text-[#46516b]"}>{String.fromCharCode(65 + i)}. {o}{q.correct.includes(i) ? " ✓" : ""}</li>)}</ol>}
        {q.explanation && <p className="mt-2 text-xs text-[#73809b]">Explanation: {q.explanation}</p>}
        {q.problems.length > 0 && <ul className="mt-3 list-disc rounded-xl bg-[#fff8e6] p-3 pl-7 text-xs text-[#9a6b00]">{q.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={`${btn} border border-[#dfe5ef] text-[#46516b]`} onClick={() => setEditing(q)}>Edit</button>
          {q.status !== "Published" && <button disabled={busy || q.problems.length > 0} title={q.problems.length ? "Fix the listed problems first" : ""} className={`${btn} bg-[#287e65] text-white`} onClick={() => call(`/api/admin/pyq/${q.id}`, "POST", { action: "publish" }, () => "Published.")}>Verified – Publish</button>}
          {q.status === "Draft" && <button disabled={busy} className={`${btn} border border-[#dc8792] text-[#bd4a5a]`} onClick={() => call(`/api/admin/pyq/${q.id}`, "POST", { action: "reject" }, () => "Rejected.")}>Reject</button>}
          {q.status !== "Draft" && <button disabled={busy} className={`${btn} border border-[#dfe5ef] text-[#46516b]`} onClick={() => call(`/api/admin/pyq/${q.id}`, "POST", { action: "draft" }, () => "Moved back to Draft.")}>{q.status === "Published" ? "Unpublish" : "Restore to Draft"}</button>}
        </div>
      </article>)}
      {!data.questions.length && <p className="rounded-2xl border border-dashed border-[#dfe5ef] p-8 text-center text-sm text-[#73809b]">No {status.toLowerCase()} questions.</p>}
    </div>

    <details className="rounded-2xl border border-[#e4e8f1] bg-white p-5"><summary className="cursor-pointer text-sm font-bold text-[#18223c]">Bulk import (JSON)</summary>
      <p className="mt-2 text-xs text-[#73809b]">Paste {"{ \"questions\": [...] }"}. Each question: exam, year, shift, sourceQuestionId, type, text, options[], correct[] (indexes), numericAnswer, explanation, sourceFile, sourcePage, and either topicId or subject + chapter + topic names. Everything is imported as Draft.</p>
      <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={8} className={`${field} font-mono text-xs`} />
      <button disabled={busy || !importText.trim()} className={`${btn} mt-3 bg-[#6366f1] text-white`} onClick={() => {
        let parsed; try { parsed = JSON.parse(importText); } catch { return setMessage({ error: true, text: "That is not valid JSON." }); }
        call("/api/admin/pyq", "POST", Array.isArray(parsed) ? { questions: parsed } : parsed, (r) => `Imported ${r.imported} as Draft.${r.results.filter((x) => x.error).map((x) => ` #${x.index + 1}: ${x.error}`).join("")}`);
      }}>Import as drafts</button></details>
        </div>
      </main>
    </div>
  );
}

function Editor({ initial, taxonomy, topicInfo, busy, onSave, onPublish, onCancel }) {
  const [q, setQ] = useState({ ...initial, options: initial.options?.length ? initial.options : initial.type === "NUMERIC" ? [] : ["", "", "", ""], numericAnswer: initial.numericAnswer ?? "", shift: initial.shift ?? "", imageUrl: initial.imageUrl ?? "", sourceFile: initial.sourceFile ?? "", sourcePage: initial.sourcePage ?? "", sourceQuestionId: initial.sourceQuestionId ?? "", explanation: initial.explanation ?? "" });
  const info = topicInfo(q.topicId);
  const [subjectId, setSubjectId] = useState(info.subject?.id || "");
  const [chapterId, setChapterId] = useState(info.chapter?.id || "");
  const set = (patch) => setQ((current) => ({ ...current, ...patch }));
  const chapters = taxonomy.find((s) => s.id === Number(subjectId))?.chapters || [];
  const topics = chapters.find((c) => c.id === Number(chapterId))?.topics || [];
  const isChoice = q.type !== "NUMERIC";
  const toggle = (i) => set({ correct: q.type === "MCQ" ? [i] : q.correct.includes(i) ? q.correct.filter((x) => x !== i) : [...q.correct, i] });
  const prepared = () => ({ ...q, year: Number(q.year), sourcePage: q.sourcePage ? Number(q.sourcePage) : null, options: isChoice ? q.options : [], correct: isChoice ? q.correct : [] });

  return <section className="space-y-3 rounded-2xl border-2 border-[#a89bea] bg-white p-5">
    <h2 className="text-lg font-extrabold text-[#18223c]">{q.id ? `Edit question #${q.id}` : "New question"}</h2>
    <div className="grid gap-3 sm:grid-cols-4">
      <label className={label}>Exam<select className={field} value={q.exam} onChange={(e) => set({ exam: e.target.value })}><option>JEE Main</option><option>JEE Advanced</option></select></label>
      <label className={label}>Year<input type="number" className={field} value={q.year} onChange={(e) => set({ year: e.target.value })} /></label>
      <label className={label}>Shift<input className={field} value={q.shift} placeholder="2024 Jan 27 Shift 1" onChange={(e) => set({ shift: e.target.value })} /></label>
      <label className={label}>Official question ID<input className={field} value={q.sourceQuestionId} onChange={(e) => set({ sourceQuestionId: e.target.value })} /></label>
    </div>
    <div className="grid gap-3 sm:grid-cols-4">
      <label className={label}>Subject<select className={field} value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setChapterId(""); set({ topicId: null }); }}><option value="">Select</option>{taxonomy.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className={label}>Chapter<select className={field} value={chapterId} onChange={(e) => { setChapterId(e.target.value); set({ topicId: null }); }}><option value="">Select</option>{chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className={label}>Topic<select className={field} value={q.topicId || ""} onChange={(e) => set({ topicId: Number(e.target.value) || null })}><option value="">Select</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label className={label}>Type<select className={field} value={q.type} onChange={(e) => set({ type: e.target.value, correct: [], options: e.target.value === "NUMERIC" ? [] : q.options.length ? q.options : ["", "", "", ""] })}><option value="MCQ">Single correct</option><option value="MULTI">Multiple correct</option><option value="NUMERIC">Numerical</option></select></label>
    </div>
    <label className={label}>Question text<textarea rows={4} className={field} value={q.text} onChange={(e) => set({ text: e.target.value })} /></label>
    <label className={label}>Image URL (if the question has a figure)<input className={field} value={q.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} /></label>
    {isChoice ? <div><p className={label}>Options – tick the correct {q.type === "MCQ" ? "one" : "ones"} from the official answer key</p>
      {q.options.map((option, i) => <div key={i} className="mt-2 flex items-center gap-2"><input type={q.type === "MCQ" ? "radio" : "checkbox"} name="correct" checked={q.correct.includes(i)} onChange={() => toggle(i)} /><span className="w-5 text-xs font-bold">{String.fromCharCode(65 + i)}</span><input className={field + " !mt-0"} value={option} onChange={(e) => set({ options: q.options.map((o, j) => (j === i ? e.target.value : o)) })} /></div>)}</div>
      : <label className={label}>Numerical answer (from the official answer key)<input type="number" step="any" className={field} value={q.numericAnswer} onChange={(e) => set({ numericAnswer: e.target.value })} /></label>}
    <label className={label}>Explanation<textarea rows={3} className={field} value={q.explanation} onChange={(e) => set({ explanation: e.target.value })} /></label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={label}>Source file (official paper PDF)<input className={field} value={q.sourceFile} onChange={(e) => set({ sourceFile: e.target.value })} /></label>
      <label className={label}>Source page<input type="number" className={field} value={q.sourcePage} onChange={(e) => set({ sourcePage: e.target.value })} /></label>
    </div>
    <div className="flex flex-wrap gap-2 pt-1">
      <button disabled={busy} className={`${btn} bg-[#6366f1] text-white`} onClick={() => onSave(prepared())}>Save as Draft</button>
      <button disabled={busy} className={`${btn} border border-[#dfe5ef] text-[#46516b]`} onClick={onCancel}>Cancel</button>
      {q.id && <span className="self-center text-xs text-[#73809b]">Save first, then use “Verified – Publish” on the card.</span>}
    </div>
  </section>;
}
