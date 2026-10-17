"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STATUSES = ["Open", "Assigned", "Closed"];
const field = "mt-1 w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-2.5 text-sm";
const btn = "rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50";

const when = (iso) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

export default function AdminMentorRequestsPage() {
  const [access, setAccess] = useState("loading");
  const [status, setStatus] = useState("Open");
  const [data, setData] = useState({ requests: [], counts: {} });
  const [message, setMessage] = useState(null);

  const load = useCallback(async (nextStatus) => {
    const response = await fetch(`/api/admin/mentor-requests?status=${nextStatus}`);
    if (response.status === 401 || response.status === 403) return setAccess("denied");
    if (!response.ok) return setMessage({ error: true, text: "Unable to load requests." });
    setData(await response.json());
    setAccess("ok");
  }, []);

  useEffect(() => { load(status); }, [status, load]);

  async function save(request, changes) {
    setMessage(null);
    const response = await fetch(`/api/admin/mentor-requests/${request.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: request.status, assignedTo: request.assignedTo, adminNote: request.adminNote, ...changes }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage({ error: true, text: result.error || "Unable to save." });
    setMessage({ text: "Saved." });
    await load(status);
  }

  if (access === "loading") return <main className="grid min-h-screen place-items-center bg-[#f7f8fc] text-sm text-[#73809b]">Loading...</main>;
  if (access === "denied") return <main className="grid min-h-screen place-items-center bg-[#f7f8fc] p-6"><section className="max-w-md rounded-2xl border border-[#e4e8f1] bg-white p-8 text-center"><h1 className="text-2xl font-extrabold text-[#18223c]">Admin only</h1><p className="mt-3 text-sm text-[#73809b]">Log in with the admin account to see mentor requests.</p><Link href="/login" className="mt-6 inline-flex rounded-xl bg-[#6366f1] px-5 py-3 text-sm font-bold text-white">Go to login</Link></section></main>;

  return <main className="min-h-screen bg-[#f7f8fc] p-4 sm:p-8"><div className="mx-auto max-w-4xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">ADMIN</p><h1 className="text-3xl font-extrabold text-[#18223c]">Mentor requests</h1>
        <p className="mt-1 text-sm text-[#73809b]">Students ask for a mentor from the practice page. Assign someone, keep a private note, and close the request when it is handled.</p></div>
      <div className="flex gap-2"><Link href="/admin/pyq" className={`${btn} border border-[#dfe5ef] bg-white text-[#46516b]`}>PYQ review</Link><Link href="/dashboard" className={`${btn} border border-[#dfe5ef] bg-white text-[#46516b]`}>Dashboard</Link></div>
    </div>

    <div className="flex gap-2">{STATUSES.map((s) => <button key={s} onClick={() => setStatus(s)} className={`${btn} ${status === s ? "bg-[#18223c] text-white" : "border border-[#dfe5ef] bg-white text-[#46516b]"}`}>{s} ({data.counts[s] || 0})</button>)}</div>
    {message && <p className={`rounded-xl p-3 text-sm ${message.error ? "bg-[#fff0f2] text-[#bd4a5a]" : "bg-[#e9f8f1] text-[#287e65]"}`}>{message.text}</p>}

    <div className="space-y-3">
      {data.requests.map((request) => <RequestCard key={`${request.id}-${request.updatedAt}`} request={request} onSave={save} />)}
      {!data.requests.length && <p className="rounded-2xl border border-dashed border-[#dfe5ef] p-8 text-center text-sm text-[#73809b]">No {status.toLowerCase()} requests.</p>}
    </div>
  </div></main>;
}

function RequestCard({ request, onSave }) {
  const [assignedTo, setAssignedTo] = useState(request.assignedTo);
  const [adminNote, setAdminNote] = useState(request.adminNote);
  return <article className="rounded-2xl border border-[#e4e8f1] bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><p className="text-sm font-extrabold text-[#18223c]">{request.name}</p><a href={`mailto:${request.email}`} className="text-xs text-[#6958d2]">{request.email}</a></div>
      <span className="text-xs text-[#73809b]">Requested {when(request.createdAt)}</span>
    </div>
    <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#fafbfe] p-3 text-sm text-[#46516b]">{request.context || "No question attached."}</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-bold text-[#46516b]">Assigned mentor<input className={field} value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Mentor's name" /></label>
      <label className="text-xs font-bold text-[#46516b]">Private note<input className={field} value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="Only you can see this" /></label>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <button className={`${btn} bg-[#287e65] text-white`} onClick={() => onSave({ ...request, assignedTo, adminNote }, { status: "Assigned" })}>{request.status === "Assigned" ? "Update assignment" : "Assign"}</button>
      {request.status !== "Closed" && <button className={`${btn} border border-[#dfe5ef] text-[#46516b]`} onClick={() => onSave({ ...request, assignedTo, adminNote }, { status: "Closed" })}>Close request</button>}
      {request.status !== "Open" && <button className={`${btn} border border-[#dfe5ef] text-[#46516b]`} onClick={() => onSave({ ...request, assignedTo: "", adminNote }, { status: "Open", assignedTo: "" })}>Reopen</button>}
      <button className={`${btn} border border-[#dfe5ef] text-[#46516b]`} onClick={() => onSave({ ...request, assignedTo, adminNote }, {})}>Save note only</button>
    </div>
  </article>;
}
