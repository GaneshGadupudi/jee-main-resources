"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import ContentPage, { Card } from "@/components/ContentPage";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (password.length < 6) return setMessage("Password must be at least 6 characters.");
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) return setMessage(error.message);
    setMessage("Password updated. You can now log in.");
  }
  return <ContentPage title="Set a new password" intro="Choose a new password for your account."><Card className="mt-8 max-w-[440px]"><form onSubmit={submit}><label className="block text-sm font-bold text-[#46516b]">New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dfe5ef] p-3" /></label><button type="submit" className="mt-5 w-full rounded-xl bg-[#6366f1] px-4 py-3 font-bold text-white">Save password</button><p role="status" className="mt-3 text-sm text-[#bd5050]">{message}</p></form></Card></ContentPage>;
}
