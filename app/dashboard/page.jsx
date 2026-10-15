"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Dashboard from "@/components/Dashboard";
import { getSupabase } from "@/lib/supabase";
import { hasCompletedOnboarding } from "@/lib/onboarding";

export default function DashboardPage() {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    getSupabase().auth.getUser().then(({ data }) => {
      if (!active) return;
      if (!data.user) {
        setStatus("unauthenticated");
        return;
      }
      if (!hasCompletedOnboarding(data.user)) {
        window.location.href = "/onboarding";
        return;
      }
      setStatus("authenticated");
    }).catch(() => {
      if (active) setStatus("unauthenticated");
    });
    return () => { active = false; };
  }, []);

  if (status === "loading") return <main className="grid min-h-screen place-items-center bg-[#f7f8fc] p-6 text-sm text-[#73809b]">Checking your account...</main>;
  if (status === "unauthenticated") return <main className="grid min-h-screen place-items-center bg-[#f7f8fc] p-6"><section className="w-full max-w-md rounded-2xl border border-[#e4e8f1] bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-extrabold text-[#18223c]">Please log in</h1><p className="mt-3 text-sm leading-6 text-[#73809b]">Your dashboard is available only after you log in to your account.</p><Link href="/login" className="mt-6 inline-flex rounded-xl bg-[#6366f1] px-5 py-3 text-sm font-bold text-white">Go to login</Link></section></main>;
  return <Dashboard />;
}
