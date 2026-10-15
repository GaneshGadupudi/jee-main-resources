"use client";

import Link from "next/link";
import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 6) return setMessage("Enter your name, email and a password of at least 6 characters.");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create your account.");
      window.location.href = "/onboarding";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create your account.");
    } finally {
      setBusy(false);
    }
  }

  return <><SiteHeader active="Sign up" /><main className="min-h-[calc(100vh-128px)] py-16"><div className="mx-auto max-w-[440px] px-5"><section className="rounded-2xl border border-[#dfe5ef] bg-white p-7 shadow-sm"><h1 className="text-3xl font-extrabold text-[#18223c]">Create your account</h1><p className="mt-2 text-base text-[#69758d]">Start a focused preparation workspace in under a minute.</p><form onSubmit={submit} className="mt-6"><label className="mb-1 block text-sm font-bold text-[#46516b]" htmlFor="name">Name</label><input id="name" value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-4 py-3 text-sm" /><label className="mb-1 mt-4 block text-sm font-bold text-[#46516b]" htmlFor="signup-email">Email</label><input id="signup-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-4 py-3 text-sm" /><label className="mb-1 mt-4 block text-sm font-bold text-[#46516b]" htmlFor="signup-password">Password</label><input id="signup-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-4 py-3 text-sm" /><button disabled={busy} type="submit" className="mt-5 w-full rounded-xl bg-[#6366f1] px-4 py-3 font-bold text-white disabled:opacity-60">{busy ? "Creating..." : "Create account"}</button><p role="status" className="mt-3 min-h-6 text-sm text-[#bd5050]">{message}</p></form><p className="mt-2 text-center text-sm text-[#536079]">Already have an account? <Link href="/login" className="font-bold text-[#6353c6]">Log in</Link></p></section></div></main><SiteFooter /></>;
}
