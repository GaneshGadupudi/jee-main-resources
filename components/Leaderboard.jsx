"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { clock } from "@/lib/contest";
import { Card } from "@/components/TestRoom";

// Rank, percentile and the top 10 for one weekly contest. Names are shortened (first name + last initial) because other students can see them.
export default function Leaderboard({ contestId, title }) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    let active = true;
    setState({ loading: true, data: null, error: "" });
    fetch(`/api/me/leaderboard?contest=${encodeURIComponent(contestId)}`)
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => { if (active) setState(ok ? { loading: false, data, error: "" } : { loading: false, data: null, error: data.error || "Unable to load the leaderboard." }); })
      .catch(() => { if (active) setState({ loading: false, data: null, error: "Unable to load the leaderboard." }); });
    return () => { active = false; };
  }, [contestId]);

  const { data } = state;
  return <Card>
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">LEADERBOARD</p>{title && <h2 className="mt-1 text-lg font-extrabold text-[#27314c]">{title}</h2>}</div>
      <Trophy size={18} className="text-[#d29a3a]" />
    </div>
    {state.loading && <p className="mt-4 text-sm text-[#8994aa]">Loading...</p>}
    {state.error && <p className="mt-4 text-sm text-[#bd4a5a]">{state.error}</p>}
    {data && !data.participants && <p className="mt-4 text-sm text-[#73809b]">Nobody has taken this contest live yet. Ranks appear once students submit during the contest window.</p>}
    {data && data.me && <div className="mt-4 grid gap-3 rounded-xl border border-[#dcd8fb] bg-[#f7f5ff] p-4 sm:grid-cols-3">
      {[["Your rank", data.participants ? `#${data.me.rank} of ${data.participants}` : "–"], ["Percentile", data.me.percentile === null ? "–" : data.me.percentile.toFixed(2)], ["Your score", data.me.score]].map(([label, value]) => <div key={label}><span className="block text-[10px] font-extrabold tracking-wide text-[#8175bd]">{label.toUpperCase()}</span><strong className="text-xl text-[#29274e]">{value}</strong></div>)}
      {data.me.virtual && <p className="text-xs text-[#73809b] sm:col-span-3">This was a virtual attempt, so you are placed against the {data.participants} student{data.participants === 1 ? "" : "s"} who took the contest live. You do not appear in the table.</p>}
    </div>}
    {data && data.participants > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm">
      <thead><tr className="text-[10px] font-extrabold tracking-wide text-[#8993ac]"><th className="py-2 pr-3">RANK</th><th className="py-2 pr-3">STUDENT</th><th className="py-2 pr-3 text-right">SCORE</th><th className="py-2 pr-3 text-right">ACCURACY</th><th className="py-2 text-right">TIME</th></tr></thead>
      <tbody className="divide-y divide-[#edf0f5]">{data.top.map((row) => <tr key={`${row.rank}-${row.name}-${row.timeMs}`} className={row.isMe ? "bg-[#f7f5ff] font-bold" : ""}>
        <td className="py-2.5 pr-3 tabular-nums text-[#46516c]">#{row.rank}</td><td className="py-2.5 pr-3 text-[#303a55]">{row.name}{row.isMe && <span className="ml-2 rounded-full bg-[#eeeaff] px-2 py-0.5 text-[10px] font-extrabold text-[#6958d2]">YOU</span>}</td>
        <td className="py-2.5 pr-3 text-right tabular-nums">{row.score}</td><td className="py-2.5 pr-3 text-right tabular-nums">{row.accuracy}%</td><td className="py-2.5 text-right tabular-nums text-[#73809b]">{clock(row.timeMs)}</td></tr>)}</tbody>
    </table></div>}
    {data && data.participants > 10 && <p className="mt-3 text-[11px] text-[#8994aa]">Showing the top 10 of {data.participants} participants.</p>}
  </Card>;
}

// Leaderboard with a contest picker, for the main Weekly Challenge page.
export function ContestLeaderboard({ contests, defaultId }) {
  const [id, setId] = useState(defaultId || contests[0]?.id);
  const contest = contests.find((item) => item.id === id) || contests[0];
  if (!contest) return null;
  return <div className="space-y-3">
    <label className="block text-xs font-bold text-[#46516b]">Show leaderboard for
      <select value={contest.id} onChange={(event) => setId(event.target.value)} className="ml-2 rounded-xl border border-[#dfe5ef] bg-white p-2 text-sm font-normal">{contests.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
    </label>
    <Leaderboard contestId={contest.id} title={contest.title} />
  </div>;
}
