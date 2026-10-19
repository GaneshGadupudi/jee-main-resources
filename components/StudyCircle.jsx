"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, LogOut, Trophy, Users } from "lucide-react";
import { Card } from "@/components/TestRoom";

const fmtDay = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };

// Study circle: private groups of friends with a weekly leaderboard. Friends join with an invite code.
export default function StudyCircle({ onInvitesChange }) {
  const [groups, setGroups] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [week, setWeek] = useState(null);
  const [invites, setInvites] = useState([]);
  const [notice, setNotice] = useState("");
  const [emails, setEmails] = useState({});
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  const request = async (method, url, body) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) setError(data.error || "Something went wrong. Please try again.");
      else {
        setGroups(data.groups); setInvites(data.invites || []); onInvitesChange?.(data.invites || []); setWeek(data.week);
        if (data.notice) setNotice(data.notice);
        if (method !== "GET" && weekOffset !== 0) { // the change was applied to this week's view: reload the week being viewed
          const again = await fetch(`/api/me/circle?week=${weekOffset}`).then((r) => r.json()).catch(() => null);
          if (again?.groups) { setGroups(again.groups); setWeek(again.week); }
        }
        return true;
      }
    } catch { setError("Unable to reach the server."); }
    finally { setBusy(false); }
    return false;
  };

  useEffect(() => { request("GET", `/api/me/circle?week=${weekOffset}`); }, [weekOffset]);

  const copyCode = (value) => {
    navigator.clipboard?.writeText(value).then(() => { setCopied(value); setTimeout(() => setCopied(""), 1500); }).catch(() => {});
  };
  const inputClass = "w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm";
  const buttonClass = "rounded-xl bg-[#7564ed] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#6655df] disabled:opacity-50";

  return <div className="space-y-5">
    <div>
      <p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">STUDY TOGETHER</p>
      <h1 className="text-3xl font-extrabold text-[#18223c]">Study circle</h1>
      <p className="mt-2 text-sm text-[#73809b]">Make a private group, share its invite code with friends, and see who is most consistent this week.</p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <h2 className="text-sm font-extrabold text-[#27314c]">Create a group</h2>
        <form onSubmit={async (event) => { event.preventDefault(); if (await request("POST", "/api/me/circle", { action: "create", name })) setName(""); }} className="mt-3 flex gap-2">
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} placeholder="e.g. Drop year warriors" aria-label="Group name" className={inputClass} />
          <button disabled={busy || name.trim().length < 2} className={buttonClass}>Create</button>
        </form>
      </Card>
      <Card>
        <h2 className="text-sm font-extrabold text-[#27314c]">Join with an invite code</h2>
        <form onSubmit={async (event) => { event.preventDefault(); if (await request("POST", "/api/me/circle", { action: "join", code })) setCode(""); }} className="mt-3 flex gap-2">
          <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={8} placeholder="e.g. K7M2QX" aria-label="Invite code" className={`${inputClass} uppercase tracking-widest`} />
          <button disabled={busy || code.trim().length < 4} className={buttonClass}>Join</button>
        </form>
      </Card>
    </div>
    {notice && <p role="status" className="text-sm font-bold text-[#2c967b]">{notice}</p>}
    {error && <p role="alert" className="text-sm font-bold text-[#bd4a5a]">{error}</p>}

    {invites.length > 0 && <Card className="border-[#dcd8fb] bg-[#f7f5ff]">
      <h2 className="text-sm font-extrabold text-[#27314c]">Invitations</h2>
      <div className="mt-3 divide-y divide-[#e6e1f7]">{invites.map((invite) => <div key={invite.groupId} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
        <p className="text-sm text-[#46516c]"><strong>{invite.invitedBy}</strong> invited you to join <strong>{invite.groupName}</strong></p>
        <div className="flex gap-2">
          <button disabled={busy} onClick={() => request("POST", "/api/me/circle", { action: "accept", groupId: invite.groupId })} className={buttonClass}>Accept</button>
          <button disabled={busy} onClick={() => request("POST", "/api/me/circle", { action: "decline", groupId: invite.groupId })} className="rounded-xl border border-[#dfe3ef] bg-white px-4 py-2.5 text-sm font-bold text-[#34405b] disabled:opacity-50">Decline</button>
        </div>
      </div>)}</div>
    </Card>}

    {week && <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-bold text-[#46516c]">{weekOffset === 0 ? "This week" : weekOffset === -1 ? "Last week" : `${-weekOffset} weeks ago`} <span className="font-normal text-[#8994aa]">· {fmtDay(week.start)} – {fmtDay(week.end)}</span></p>
      <div className="flex gap-2">
        <button disabled={busy || !week.canGoBack} onClick={() => setWeekOffset((value) => value - 1)} className="inline-flex items-center gap-1 rounded-lg border border-[#dfe3ef] bg-white px-3 py-1.5 text-xs font-bold text-[#34405b] disabled:opacity-40"><ChevronLeft size={14} />Previous week</button>
        <button disabled={busy || weekOffset === 0} onClick={() => setWeekOffset((value) => value + 1)} className="inline-flex items-center gap-1 rounded-lg border border-[#dfe3ef] bg-white px-3 py-1.5 text-xs font-bold text-[#34405b] disabled:opacity-40">Next week<ChevronRight size={14} /></button>
        {weekOffset !== 0 && <button disabled={busy} onClick={() => setWeekOffset(0)} className="rounded-lg bg-[#f0edff] px-3 py-1.5 text-xs font-bold text-[#5e4bc1]">This week</button>}
      </div>
    </div>}

    {groups === null && !error && <p className="text-sm text-[#8994aa]">Loading...</p>}
    {groups && !groups.length && <Card className="flex items-center gap-3 text-sm text-[#73809b]"><Users size={20} className="shrink-0 text-[#7564ed]" />You are not in a group yet. Create one or join with a friend&apos;s code to start a leaderboard.</Card>}

    {groups?.map((group) => <Card key={group.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">{weekOffset === 0 ? "THIS WEEK" : weekOffset === -1 ? "LAST WEEK" : "PAST WEEK"} · {group.members.length} MEMBER{group.members.length === 1 ? "" : "S"}</p>
          <h2 className="mt-1 text-lg font-extrabold text-[#27314c]">{group.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => copyCode(group.code)} title="Copy invite code" className="inline-flex items-center gap-2 rounded-lg border border-[#dcd8fb] bg-[#f7f5ff] px-3 py-1.5 text-xs font-extrabold tracking-widest text-[#5e4bc1]"><Copy size={13} />{copied === group.code ? "COPIED" : group.code}</button>
          <button disabled={busy} onClick={() => { if (window.confirm(`Leave "${group.name}"?`)) request("DELETE", `/api/me/circle?group=${group.id}`); }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-[#8994aa] hover:text-[#bd5050]"><LogOut size={14} />Leave</button>
        </div>
      </div>
      <form onSubmit={async (event) => { event.preventDefault(); if (await request("POST", "/api/me/circle", { action: "invite", groupId: group.id, email: emails[group.id] })) setEmails((current) => ({ ...current, [group.id]: "" })); }} className="mt-4 flex gap-2">
        <input type="email" value={emails[group.id] || ""} onChange={(event) => setEmails((current) => ({ ...current, [group.id]: event.target.value }))} placeholder="Invite a friend by email" aria-label={`Invite a friend to ${group.name} by email`} className={inputClass} />
        <button disabled={busy || !(emails[group.id] || "").includes("@")} className={buttonClass}>Invite</button>
      </form>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm">
        <thead><tr className="text-[10px] font-extrabold tracking-wide text-[#8993ac]"><th className="py-2 pr-3">RANK</th><th className="py-2 pr-3">STUDENT</th><th className="py-2 pr-3 text-right">CORRECT</th><th className="py-2 pr-3 text-right">ACCURACY</th><th className="py-2 text-right">STUDY TIME</th></tr></thead>
        <tbody className="divide-y divide-[#edf0f5]">{group.members.map((member, index) => <tr key={index} className={member.isMe ? "bg-[#f7f5ff] font-bold" : ""}>
          <td className="py-2.5 pr-3 tabular-nums text-[#46516c]">{member.rank === 1 && member.correct > 0 ? <Trophy size={14} className="inline text-[#d29a3a]" /> : `#${member.rank}`}</td>
          <td className="py-2.5 pr-3 text-[#303a55]">{member.name}{member.isMe && <span className="ml-2 rounded-full bg-[#eeeaff] px-2 py-0.5 text-[10px] font-extrabold text-[#6958d2]">YOU</span>}</td>
          <td className="py-2.5 pr-3 text-right tabular-nums">{member.correct}</td>
          <td className="py-2.5 pr-3 text-right tabular-nums">{member.total ? `${member.accuracy}%` : "–"}</td>
          <td className="py-2.5 text-right tabular-nums text-[#73809b]">{member.minutes ? `${Math.floor(member.minutes / 60)}h ${member.minutes % 60}m` : "–"}</td></tr>)}</tbody>
      </table></div>
    </Card>)}
    {groups?.length > 0 && <p className="text-xs text-[#8994aa]">Rankings restart every Monday; use the arrows to look back up to 12 weeks. Group members can see your name and weekly activity.</p>}
  </div>;
}
