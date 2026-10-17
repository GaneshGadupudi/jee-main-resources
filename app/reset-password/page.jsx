"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ContentPage, { Card } from "@/components/ContentPage";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [link, setLink] = useState("checking"); // checking | valid | invalid
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token") || "";
    setToken(value);
    if (!value) return setLink("invalid");
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(value)}`)
      .then((response) => response.json())
      .then((data) => setLink(data.valid ? "valid" : "invalid"))
      .catch(() => setLink("invalid"));
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (password.length < 6) return setMessage("Password must be at least 6 characters.");
    if (password !== confirm) return setMessage("The two passwords do not match.");
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await response.json();
      if (!response.ok) {
        if (/invalid or has expired/i.test(data.error || "")) setLink("invalid");
        return setMessage(data.error || "Unable to reset your password.");
      }
      setDone(true);
    } catch {
      setMessage("Unable to reset your password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1 w-full rounded-xl border border-[#dfe5ef] p-3";
  return <ContentPage title="Set a new password" intro="Choose a new password for your account.">
    <Card className="mt-8 max-w-[440px]">
      {link === "checking" && <p className="text-sm text-[#73809b]">Checking your link...</p>}
      {link === "invalid" && !done && <div><p className="font-bold text-[#bd4a5a]">This reset link is invalid or has expired.</p><p className="mt-2 text-sm text-[#73809b]">Links work once and last one hour. Request a fresh one from the login page.</p><Link href="/login" className="mt-5 inline-flex rounded-xl bg-[#6366f1] px-4 py-3 font-bold text-white">Back to login</Link></div>}
      {done && <div><p className="font-bold text-[#2c967b]">Your password has been updated.</p><Link href="/login" className="mt-5 inline-flex rounded-xl bg-[#6366f1] px-4 py-3 font-bold text-white">Log in</Link></div>}
      {link === "valid" && !done && <form onSubmit={submit}>
        <label className="block text-sm font-bold text-[#46516b]">New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={input} /></label>
        <label className="mt-4 block text-sm font-bold text-[#46516b]">Confirm new password<input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className={input} /></label>
        <button type="submit" disabled={busy} className="mt-5 w-full rounded-xl bg-[#6366f1] px-4 py-3 font-bold text-white disabled:opacity-60">{busy ? "Saving..." : "Save password"}</button>
        <p role="status" className="mt-3 text-sm text-[#bd5050]">{message}</p>
      </form>}
    </Card>
  </ContentPage>;
}
