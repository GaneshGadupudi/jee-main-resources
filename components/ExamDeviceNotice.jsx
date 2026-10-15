"use client";

import { Monitor, Tablet } from "lucide-react";

export default function ExamDeviceNotice({ onBack }) {
  return <main className="grid min-h-screen place-items-center bg-[#f7f8fc] p-5">
    <section className="w-full max-w-lg rounded-2xl border border-[#e4e8f1] bg-white p-7 text-center shadow-sm">
      <div className="mx-auto flex w-fit items-center gap-2 rounded-2xl bg-[#f0edff] px-4 py-3 text-[#6958d2]"><Monitor size={22} /><Tablet size={22} /></div>
      <h1 className="mt-5 text-2xl font-extrabold text-[#18223c]">Open this exam on a larger screen</h1>
      <p className="mt-3 text-sm leading-6 text-[#73809b]">Mock tests and weekly challenges are available only on a desktop, laptop, tablet, or iPad. Please open your account on one of these devices to write the exam.</p>
      <button type="button" onClick={onBack} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#7564ed] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(117,100,237,.2)] hover:bg-[#6655df]">Back to dashboard</button>
      <p className="mt-4 text-[11px] text-[#8994aa]">Your exam has not started.</p>
    </section>
  </main>;
}
