"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ContentPage, { Card } from "@/components/ContentPage";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [link, setLink] = useState("checking"); // checking | valid | invalid
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
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
      .then((data) => {
        if (data.valid) {
          setLink("valid");
          if (data.role) setUserRole(data.role);
          if (data.name) setUserName(data.name);
        } else {
          setLink("invalid");
        }
      })
      .catch(() => setLink("invalid"));
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (password.length < 6) return setMessage("Password must be at least 6 characters.");
    if (password !== confirm) return setMessage("The two passwords do not match.");
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (/invalid or has expired/i.test(data.error || "")) setLink("invalid");
        return setMessage(data.error || "Unable to save your password.");
      }
      if (data.role) setUserRole(data.role);
      setDone(true);
    } catch {
      setMessage("Unable to save your password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const isMentor = userRole === "mentor";
  const title = isMentor ? "Activate Your Mentor Account" : "Set a new password";
  const intro = isMentor
    ? `Welcome ${userName || "Mentor"}! Choose a secure password to activate your mentor account and unlock the Mentor Desk.`
    : "Choose a new password for your account.";

  const inputClass = "mt-1 w-full rounded-xl border border-[#dfe5ef] p-3 outline-none focus:border-[#7564ed] focus:ring-4 focus:ring-[#7564ed]/10";

  return (
    <ContentPage title={title} intro={intro}>
      <Card className="mt-8 max-w-[440px]">
        {link === "checking" && (
          <p className="text-sm text-[#73809b]">Verifying your security link...</p>
        )}

        {link === "invalid" && !done && (
          <div>
            <p className="font-bold text-[#bd4a5a]">This activation link is invalid or has expired.</p>
            <p className="mt-2 text-sm text-[#73809b]">
              Security links work once and expire for your protection. If you need a new link, you can request one via the login page.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex rounded-xl bg-[#6366f1] px-4 py-3 font-bold text-white hover:bg-[#5254db]"
            >
              Back to login
            </Link>
          </div>
        )}

        {done && (
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#e4f8f5] px-3 py-1 text-xs font-bold text-[#247b70]">
              ✓ Password Saved Successfully
            </div>
            <p className="font-bold text-[#18223c]">
              {isMentor ? "Your Mentor account is now active!" : "Your password has been updated."}
            </p>
            <p className="mt-2 text-sm text-[#73809b]">
              {isMentor
                ? "You can now log in to conduct 1-on-1 sessions and provide written solutions."
                : "You can now log in to your account with your new password."}
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#2c967b] px-4 py-3 font-bold text-white shadow-sm hover:bg-[#247b70]"
            >
              Log in to {isMentor ? "Mentor Desk" : "Dashboard"}
            </Link>
          </div>
        )}

        {link === "valid" && !done && (
          <form onSubmit={submit}>
            {isMentor && (
              <div className="mb-4 rounded-xl bg-[#f0edff] p-3 text-xs font-semibold text-[#6353c6]">
                🎓 Verified Mentor Access: Create a password to begin accepting student doubts and written solutions.
              </div>
            )}
            <label className="block text-sm font-bold text-[#46516b]">
              New password
              <input
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="mt-4 block text-sm font-bold text-[#46516b]">
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Re-type your password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className={inputClass}
                required
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="mt-5 w-full rounded-xl bg-[#6366f1] px-4 py-3 font-bold text-white transition hover:bg-[#5254db] disabled:opacity-60"
            >
              {busy ? "Saving password..." : isMentor ? "Activate Account & Save Password" : "Save password"}
            </button>
            {message && (
              <p role="status" className="mt-3 text-sm text-[#bd5050]">
                {message}
              </p>
            )}
          </form>
        )}
      </Card>
    </ContentPage>
  );
}
