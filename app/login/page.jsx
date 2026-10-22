"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!email.trim() || !password) return setMessage("Enter your email and password.");
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to log in.");
      window.location.href = data.user && data.user.role === "mentor" ? "/mentor/dashboard" : "/dashboard";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to log in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function googleLogin() {
    setMessage("Google sign-in is not available while MS SQL authentication is enabled.");
  }

  async function forgotPassword() {
    if (!email.trim()) return setMessage("Type your email above, then click Forgot password.");
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      setMessageOk(response.ok);
      setMessage(response.ok ? data.message : data.error || "Unable to send the reset link.");
    } catch {
      setMessageOk(false);
      setMessage("Unable to send the reset link. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader active="Log in" />
      <main className="min-h-[calc(100vh-128px)] py-16">
        <div className="mx-auto max-w-[440px] px-5">
          <section className="rounded-2xl border border-[#dfe5ef] bg-white p-7 shadow-sm">
            <h1 className="text-3xl font-extrabold text-[#18223c]">Welcome back</h1>
            <p className="mt-2 text-base text-[#69758d]">
              Log in to open your student dashboard and resources.
            </p>
            <button onClick={googleLogin} type="button" className="mt-6 w-full rounded-xl border border-[#dfe5ef] bg-white px-4 py-3 font-bold text-[#34405b] hover:bg-[#f7f8fc]">
              Continue with Google
            </button>
            <p className="my-4 text-center text-sm text-[#8490a6]">or use your email</p>
            <form onSubmit={submit} noValidate>
              <label className="mb-1 block text-sm font-bold text-[#46516b]" htmlFor="email">
                Email
              </label>
              <input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-4 py-3 text-sm outline-none focus:border-[#7564ed] focus:ring-4 focus:ring-[#7564ed]/10" />
              <label className="mb-1 mt-4 block text-sm font-bold text-[#46516b]" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-4 py-3 pr-11 text-sm outline-none focus:border-[#7564ed] focus:ring-4 focus:ring-[#7564ed]/10" />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-[#7f8aa1]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              <p className="mt-2 text-right">
                <button type="button" onClick={forgotPassword} className="text-xs font-bold text-[#6353c6]">Forgot password?</button>
              </p>
              <button disabled={busy} type="submit" className="mt-4 w-full rounded-xl bg-[#7564ed] px-4 py-3 text-sm font-bold text-white hover:bg-[#6655df] disabled:opacity-60 disabled:cursor-not-allowed">
                Sign in
              </button>
            </form>
            {message && (
              <p className={`mt-4 text-sm ${messageOk ? "text-[#2c967b]" : "text-[#bd4a5a]"}`}>{message}</p>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
