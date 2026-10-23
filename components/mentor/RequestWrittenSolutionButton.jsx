"use client";

import { useState } from "react";
import { PenTool, CheckCircle2, Clock, RefreshCw, AlertCircle, ArrowRight } from "lucide-react";

export default function RequestWrittenSolutionButton({
  question,
  subject,
  chapter,
  options = [],
  writtenSolutions = [],
  onSolutionRequested = null,
  onViewSolutions = null,
}) {
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!question) return null;

  // Check if a request for this exact question already exists
  const existing = writtenSolutions.find(
    (s) => s.questionText && s.questionText.includes(question.trim())
  );

  const handleRequest = async () => {
    setBusy(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const optionsText =
        options && options.length > 0
          ? "\n\nOptions:\n" +
            options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join("\n")
          : "";

      const fullQuestionText = `${question.trim()}${optionsText}`;

      const res = await fetch("/api/me/written-solutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject || "Physics",
          chapter: chapter || "",
          questionText: fullQuestionText,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Solution requested! Mentors have been notified.");
        if (onSolutionRequested && data.request) {
          onSolutionRequested(data.request);
        }
      } else {
        setErrorMsg(data.error || "Unable to request mentor solution.");
      }
    } catch {
      setErrorMsg("Network error requesting solution.");
    } finally {
      setBusy(false);
    }
  };

  // State A: A mentor already completed the solution
  if (existing?.status === "Completed") {
    return (
      <div className="mt-2.5 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-left">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#166534]">
            <CheckCircle2 size={15} className="shrink-0 text-[#16a34a]" />
            <span>Mentor Solution Ready!</span>
          </div>
          {onViewSolutions && (
            <button
              type="button"
              onClick={onViewSolutions}
              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#166534] underline hover:text-[#14532d]"
            >
              <span>View</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // State B: Solution request is currently pending or assigned
  if (existing || successMsg) {
    return (
      <div className="mt-2.5 rounded-xl border border-[#dcd8fb] bg-[#f4f2ff] p-3 text-left">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#5b21b6]">
            <Clock size={15} className="shrink-0 text-[#7c3aed]" />
            <span>{successMsg || "Solution Requested (Awaiting Mentor)"}</span>
          </div>
          {onViewSolutions && (
            <button
              type="button"
              onClick={onViewSolutions}
              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#5b21b6] underline hover:text-[#431407]"
            >
              <span>Track</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // State C: Default button to request written solution
  return (
    <div className="mt-2.5">
      <button
        type="button"
        onClick={handleRequest}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#7564ed] px-3.5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#6655df] disabled:opacity-60"
      >
        {busy ? (
          <>
            <RefreshCw size={14} className="animate-spin" />
            <span>Requesting Solution...</span>
          </>
        ) : (
          <>
            <PenTool size={14} />
            <span>Request a Mentor Solution</span>
          </>
        )}
      </button>

      {errorMsg && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#ef4444]">
          <AlertCircle size={12} />
          <span>{errorMsg}</span>
        </p>
      )}
    </div>
  );
}

