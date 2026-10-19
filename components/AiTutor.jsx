"use client";

import { useEffect, useRef, useState } from "react";
import { BrainCircuit, Send, Sparkles } from "lucide-react";

// AI tutor for the practice question on screen. Sends the whole conversation to /api/tutor so follow-up questions work.
// `context` is the current question (the correct option is only included once the student has answered).
// `children` is shown under the chat (the "request a mentor" block).

function inline(text, keyBase) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={`${keyBase}-${index}`}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={`${keyBase}-${index}`} className="rounded bg-[#efeafc] px-1 py-0.5 text-[0.85em]">{part.slice(1, -1)}</code>;
    return part;
  });
}

// Small, safe formatter for the tutor's replies: paragraphs, numbered and bullet lists, headings, **bold** and `code`. No HTML is injected.
function Reply({ text }) {
  const blocks = [];
  for (const line of text.replace(/\r/g, "").split("\n")) {
    const trimmed = line.trim();
    const last = blocks[blocks.length - 1];
    if (!trimmed) { blocks.push({ type: "gap" }); continue; }
    const numbered = trimmed.match(/^\d+[.)]\s+(.*)/);
    const bullet = trimmed.match(/^[-*•]\s+(.*)/);
    const heading = trimmed.match(/^#{1,4}\s+(.*)/);
    if (numbered) (last?.type === "ol" ? last : blocks[blocks.push({ type: "ol", items: [] }) - 1]).items.push(numbered[1]);
    else if (bullet) (last?.type === "ul" ? last : blocks[blocks.push({ type: "ul", items: [] }) - 1]).items.push(bullet[1]);
    else if (heading) blocks.push({ type: "h", text: heading[1] });
    else if (last?.type === "p") last.text += ` ${trimmed}`;
    else blocks.push({ type: "p", text: trimmed });
  }
  return <div className="space-y-2 break-words text-sm leading-6 text-[#46516c]">
    {blocks.filter((block) => block.type !== "gap").map((block, index) => {
      if (block.type === "h") return <p key={index} className="font-extrabold text-[#27314c]">{inline(block.text, index)}</p>;
      if (block.type === "ol") return <ol key={index} className="list-decimal space-y-1 pl-5">{block.items.map((item, i) => <li key={i}>{inline(item, `${index}-${i}`)}</li>)}</ol>;
      if (block.type === "ul") return <ul key={index} className="list-disc space-y-1 pl-5">{block.items.map((item, i) => <li key={i}>{inline(item, `${index}-${i}`)}</li>)}</ul>;
      return <p key={index}>{inline(block.text, index)}</p>;
    })}
  </div>;
}

export default function AiTutor({ context, answered, children }) {
  const [messages, setMessages] = useState([]); // [{ role: "user" | "model", text }]
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [messages, loading]);

  const ask = async (raw) => {
    const question = String(raw ?? draft).trim();
    if (!question || loading) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history: messages, context }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(response.status === 401 ? "Your session has expired. Please log in again." : data.error || "The AI Tutor could not answer right now.");
      } else {
        setMessages((current) => [...current, { role: "user", text: question }, { role: "model", text: data.reply }]);
        setDraft("");
      }
    } catch {
      setError("Unable to reach the AI Tutor. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    ["Get a hint", "Give me a hint for this question without revealing the answer."],
    ["Explain the concept", "Explain the main concept behind this question in simple terms."],
    ...(answered ? [["Explain the solution", "Explain the full solution to this question step by step."]] : []),
  ];

  return <>
    <div className="flex items-center gap-2 text-[#5e4bc1]"><Sparkles size={18} /><h2 className="font-extrabold">AI tutor</h2></div>
    <p className="mt-3 text-sm leading-6 text-[#68738b]">Ask a doubt about this question and get a clear, step-by-step explanation. You can keep asking follow-ups.</p>

    {messages.length > 0 && <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1" aria-live="polite">
      {messages.map((message, index) => message.role === "user"
        ? <div key={index} className="ml-6 rounded-2xl rounded-br-md bg-[#7564ed] px-3 py-2 text-sm leading-6 text-white [overflow-wrap:anywhere]">{message.text}</div>
        : <div key={index} className="mr-2 rounded-2xl rounded-bl-md border border-[#e6e1f7] bg-white px-3 py-2.5"><Reply text={message.text} /></div>)}
      {loading && <div className="mr-2 rounded-2xl rounded-bl-md border border-[#e6e1f7] bg-white px-3 py-2.5 text-sm text-[#8994aa]" role="status">Tutor is thinking…</div>}
      <div ref={endRef} />
    </div>}

    <form onSubmit={(event) => { event.preventDefault(); ask(); }} className="mt-4">
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(); } }}
        placeholder={messages.length ? "Ask a follow-up..." : "Type your doubt..."}
        maxLength={2000}
        disabled={loading}
        aria-label="Ask the AI tutor"
        className="h-24 w-full resize-y rounded-xl border border-[#ddd8f6] bg-white p-3 text-sm outline-none disabled:opacity-60"
      />
      <button type="submit" disabled={loading || !draft.trim()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#f0edff] px-4 py-2.5 text-sm font-bold text-[#5e4bc1] transition hover:bg-[#e5e0ff] disabled:cursor-not-allowed disabled:opacity-50">
        {loading ? <>Thinking…</> : <><Send size={16} /> Ask tutor</>}
      </button>
    </form>

    <div className="mt-3 flex flex-wrap gap-2">
      {suggestions.map(([label, prompt]) => <button key={label} type="button" disabled={loading} onClick={() => ask(prompt)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e1f7] bg-white px-2.5 py-1.5 text-xs font-bold text-[#5e4bc1] hover:bg-[#f7f5ff] disabled:opacity-50"><BrainCircuit size={13} />{label}</button>)}
      {messages.length > 0 && <button type="button" disabled={loading} onClick={() => { setMessages([]); setError(""); }} className="px-2 py-1.5 text-xs font-bold text-[#8994aa] hover:text-[#5e4bc1] disabled:opacity-50">Clear chat</button>}
    </div>

    {error && <p role="alert" className="mt-3 rounded-lg bg-[#fff1f1] p-2.5 text-xs font-bold leading-5 text-[#a34e5c]">{error}</p>}
    {children}
  </>;
}
