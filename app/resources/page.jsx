"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ContentPage, { Card } from "@/components/ContentPage";
import { resources } from "@/lib/resources";


export default function ResourcesPage() {
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("All");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch("/api/auth/session").then((response) => response.json()).then((data) => { if (active) { setUser(data.user || null); setLoading(false); } }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const shown = useMemo(() => resources.flatMap(([name, items]) => items.filter(([chapter]) => (subject === "All" || subject === name) && chapter.toLowerCase().includes(query.trim().toLowerCase())).map((item) => [name, ...item])), [query, subject]);
  if (loading) return <ContentPage title="Resources" intro="Loading your study library..." />;
  if (!user) return <ContentPage title="Resources"><Card className="login-gate mt-8 max-w-xl"><span className="login-gate-lock text-3xl">🔒</span><h2 className="mt-4 text-xl font-extrabold text-[#303b53]">Please login to access the resources</h2><p className="mt-2 text-sm leading-6 text-[#718098]">Chapter-wise short notes for Physics, Chemistry and Mathematics are free for logged-in students.</p><div className="mt-5 flex gap-3"><Link href="/login" className="rounded-xl bg-[#6366f1] px-5 py-3 font-bold text-white">Log in</Link><Link href="/signup" className="rounded-xl border border-[#dfe5ef] px-5 py-3 font-bold text-[#34405b]">Sign up</Link></div></Card></ContentPage>;
  return <ContentPage title="Resources" intro="Handwritten short notes. The number shows approximately how many questions come from the chapter (author's estimate, not official)." wide><div className="my-6 flex flex-wrap gap-3"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chapters" aria-label="Search chapters" className="min-w-[240px] flex-1 rounded-xl border border-[#dfe5ef] bg-white px-4 py-3 text-sm" /><select value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Subject" className="rounded-xl border border-[#dfe5ef] bg-white px-4 py-3 text-sm"><option>All</option><option>Physics</option><option>Chemistry</option><option>Mathematics</option></select></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{shown.map(([name, chapter, count, file]) => <Card key={`${name}-${chapter}`}><span className="rounded-full bg-[#eef0ff] px-3 py-1 text-xs font-bold text-[#5d52c7]">{name}</span><h2 className="mt-4 text-lg font-extrabold text-[#303b53]">{chapter}</h2><p className="mb-4 mt-2 text-sm text-[#718098]">About {count} questions</p>{file ? <a className="inline-flex rounded-xl bg-[#6366f1] px-4 py-2 text-sm font-bold text-white" href={`/Notes/${encodeURIComponent(file)}`} target="_blank" rel="noreferrer">Open PDF</a> : <span className="rounded-full bg-[#f1f3f8] px-3 py-1 text-xs font-bold text-[#718098]">Coming soon</span>}</Card>)}</div>{!shown.length && <p className="mt-6 text-[#718098]">No chapters match your search.</p>}</ContentPage>;
}
