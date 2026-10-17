"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, BookOpen, CheckCheck, ClipboardList, Clock3, Flame, ListChecks, Trophy, Video } from "lucide-react";
import { buildNotifications } from "@/lib/notifications";

const icons = { trophy: Trophy, video: Video, plan: ListChecks, flame: Flame, book: BookOpen, clipboard: ClipboardList, clock: Clock3 };
const tones = {
  green: "bg-[#ddf6ed] text-[#2c967b]",
  violet: "bg-[#f0edff] text-[#6958d2]",
  amber: "bg-[#fff3dc] text-[#b67821]",
  red: "bg-[#ffe8eb] text-[#c7586d]",
  blue: "bg-[#e8f0ff] text-[#4c74c7]",
};
const READ_RETENTION_MS = 30 * 86400000;
const ARCHIVE_RETENTION_MS = 90 * 86400000;

// Read notifications are stored on the server; after 30 days they move to the archive, after 90 days they disappear.
function withRetention(records) {
  const now = Date.now();
  const cutoff = now - READ_RETENTION_MS;
  const archiveCutoff = now - ARCHIVE_RETENTION_MS;
  return Object.fromEntries(Object.entries(records || {})
    .map(([id, record]) => [id, { readAt: Number(record.readAt) || now, archived: Number(record.readAt) < cutoff }])
    .filter(([, record]) => record.readAt >= archiveCutoff));
}

export default function NotificationBell({ ready, onOpenView, readRecords, onMarkRead, contestHistory, mockHistory, ...data }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const box = useRef(null);

  const refresh = () => setNow(Date.now());
  useEffect(() => { const timer = setInterval(refresh, 30000); return () => clearInterval(timer); }, []);
  const read = useMemo(() => withRetention(readRecords), [readRecords, now]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event) => { if (box.current && !box.current.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  // Nothing is built until the dashboard has loaded the student's saved data, so server and client render the same.
  const items = useMemo(() => (ready ? buildNotifications({ now, contestHistory, mockHistory, ...data }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, now, contestHistory, mockHistory, data.registered, data.planTasks, data.completed, data.mistakes, data.streak, data.todayCount, data.examDays]);
  const activeItems = items.filter((item) => !read[item.id]?.archived);
  const unread = activeItems.filter((item) => !read[item.id]);
  const visibleItems = showAll ? activeItems : unread;
  const markRead = (ids) => {
    const readAt = Date.now();
    onMarkRead(ids.map((id) => ({ id, readAt })));
  };

  return <div ref={box} className="relative">
    <button type="button" onClick={() => { if (!open) refresh(); setShowAll(false); setOpen(!open); }} aria-label={unread.length ? `Notifications, ${unread.length} unread` : "Notifications"} aria-expanded={open} className="relative rounded-lg border border-[#e4e8f1] p-2"><Bell size={16} />{unread.length > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#7564ed] px-1 text-[9px] font-extrabold leading-none text-white">{unread.length}</span>}</button>
    {open && <div role="dialog" aria-label="Notifications" className="fixed left-4 right-4 top-[68px] z-50 overflow-hidden rounded-2xl border border-[#e4e8f1] bg-white shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[24rem]">
      <div className="flex items-center justify-between border-b border-[#edf0f5] px-4 py-3"><p className="text-sm font-extrabold text-[#27314c]">{showAll ? "All messages" : "Notifications"}</p><button type="button" disabled={!unread.length} onClick={() => markRead(unread.map((item) => item.id))} className="inline-flex items-center gap-1 text-xs font-bold text-[#6958d2] disabled:opacity-40"><CheckCheck size={14} />Mark all as read</button></div>
      <div className="max-h-[70vh] overflow-y-auto sm:max-h-[26rem]">{visibleItems.length ? visibleItems.map((item) => { const Icon = icons[item.icon] || Bell; const isRead = Boolean(read[item.id]); return <button key={item.id} type="button" onClick={() => { markRead([item.id]); setOpen(false); onOpenView(item.view); }} className="flex w-full items-start gap-3 border-b border-[#edf0f5] px-4 py-3 text-left last:border-0 hover:bg-[#f7f8fc]"><span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tones[item.tone]}`}><Icon size={16} /></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><strong className={`text-[13px] leading-5 ${isRead ? "font-semibold text-[#73809b]" : "text-[#27314c]"}`}>{item.title}</strong>{!isRead && <i className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#7564ed]" />}</span><span className="mt-0.5 block text-xs leading-5 text-[#73809b]">{item.body}</span><span className="mt-1 block text-[10px] font-bold tracking-wide text-[#8994aa]">{item.when.toUpperCase()}</span></span></button>; }) : <p className="px-4 py-8 text-center text-sm text-[#73809b]">{showAll ? "No messages available." : "You are all caught up."}</p>}</div>
      <div className="border-t border-[#edf0f5] px-4 py-3 text-center">{showAll ? <button type="button" onClick={() => setShowAll(false)} className="text-xs font-bold text-[#6958d2]">Back to unread notifications</button> : <button type="button" onClick={() => setShowAll(true)} className="text-xs font-bold text-[#6958d2]">View all messages</button>}</div>
    </div>}
  </div>;
}
