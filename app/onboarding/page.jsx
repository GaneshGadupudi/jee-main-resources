"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import ContentPage, { Card } from "@/components/ContentPage";
import { hasCompletedOnboarding } from "@/lib/onboarding";

export default function OnboardingPage() {
  const [exams, setExams] = useState([]);
  const [targetExam, setTargetExam] = useState("JEE Main");
  const [date, setDate] = useState("");
  const [stage, setStage] = useState("");
  const [hours, setHours] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = "/login";
      else if (hasCompletedOnboarding(data.user)) window.location.href = "/dashboard";
    });
  }, []);
  const toggleExam = (exam) => setExams((current) => current.includes(exam) ? current.filter((item) => item !== exam) : [...current, exam]);
  async function submit(event) {
    event.preventDefault();
    if (!exams.length || !date || !stage || !hours) return setMessage("Choose at least one exam and complete the required fields.");
    const { data: { user } } = await getSupabase().auth.getUser();
    const profile = { targetExam, examDate: date, prepStage: stage, dailyHours: hours };
    const { error } = await getSupabase().from("profiles").upsert({ id: user.id, name: user.user_metadata?.name || "Student", email: user.email, exams });
    if (error) return setMessage(error.message);
    const { error: metadataError } = await getSupabase().auth.updateUser({ data: { exams, student_profile: profile } });
    if (metadataError) return setMessage(metadataError.message);
    window.location.href = "/dashboard";
  }
  return <ContentPage title="Let's make your plan yours." intro="Tell us what you are preparing for and what your study days look like."><Card className="mt-8"><form onSubmit={submit} className="space-y-5"><fieldset><legend className="mb-3 font-bold text-[#34405b]">What are you preparing for?</legend><div className="grid gap-3">{["JEE Main", "JEE Advanced", "EAMCET"].map((exam) => <label key={exam} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e0e5ef] p-3 text-sm font-bold text-[#46516b]"><input type="checkbox" checked={exams.includes(exam)} onChange={() => toggleExam(exam)} />{exam}</label>)}</div></fieldset><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-[#46516b]">Main target exam<select value={targetExam} onChange={(event) => setTargetExam(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dfe5ef] p-3 font-normal"><option>JEE Main</option><option>JEE Advanced</option><option>EAMCET</option></select></label><label className="text-sm font-bold text-[#46516b]">Target exam date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dfe5ef] p-3 font-normal" /></label><label className="text-sm font-bold text-[#46516b]">Preparation stage<select value={stage} onChange={(event) => setStage(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dfe5ef] p-3 font-normal"><option value="">Choose your stage</option><option>Class 11</option><option>Class 12</option><option>Dropper</option><option>Other</option></select></label><label className="text-sm font-bold text-[#46516b]">Study hours per day<select value={hours} onChange={(event) => setHours(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dfe5ef] p-3 font-normal"><option value="">Choose hours</option>{[1, 2, 3, 4, 5, "6+"].map((item) => <option key={item}>{item} hours</option>)}</select></label></div><button type="submit" disabled={!exams.length} className="w-full rounded-xl bg-[#6366f1] px-4 py-3 font-bold text-white disabled:opacity-50">Continue</button><p role="status" className="text-sm text-[#bd5050]">{message}</p></form></Card></ContentPage>;
}
