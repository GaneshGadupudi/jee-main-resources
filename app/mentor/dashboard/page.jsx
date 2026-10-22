"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import {
  Video,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  BookOpen,
  MessageSquare,
  Check,
  X,
  Shield,
  ArrowRight,
  Award,
  CircleDot,
  Radio,
  FileText,
  UserCheck,
  HelpCircle,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { VideoCall } from "@/components/video/VideoCall";

export default function MentorDashboardPage() {
  const [status, setStatus] = useState("loading"); // "loading" | "authenticated" | "unauthenticated" | "forbidden"
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [activeTab, setActiveTab] = useState("waiting"); // "waiting" | "active" | "history"
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState(null); // { text, type: 'success' | 'error' | 'info' }
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mentorNotes, setMentorNotes] = useState("");
  const pollTimerRef = useRef(null);

  // Initial authentication & data load
  useEffect(() => {
    let active = true;

    async function initAuth() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (!active) return;

        if (!data.user) {
          setStatus("unauthenticated");
          return;
        }

        if (data.user.role !== "mentor") {
          setStatus("forbidden");
          return;
        }

        setUser(data.user);
        setStatus("authenticated");
        await Promise.all([loadSessionsSilently(), checkAvailability()]);
      } catch (err) {
        if (active) setStatus("unauthenticated");
      }
    }

    initAuth();

    return () => {
      active = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Poll for new sessions and availability every 6 seconds when authenticated
  useEffect(() => {
    if (status !== "authenticated") return;

    pollTimerRef.current = setInterval(() => {
      loadSessionsSilently();
      checkAvailability();
    }, 6000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [status]);

  const loadSessionsSilently = async () => {
    try {
      const res = await fetch("/api/mentor/sessions");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      }
    } catch {}
  };

  const loadSessions = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/mentor/sessions");
      const data = await res.json();
      if (res.ok && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        setMessage({ text: "Sessions refreshed.", type: "info" });
      } else {
        setMessage({ text: data.error || "Unable to refresh sessions.", type: "error" });
      }
    } catch {
      setMessage({ text: "Unable to refresh sessions.", type: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  const checkAvailability = async () => {
    try {
      const res = await fetch("/api/mentor/availability");
      if (!res.ok) return;
      const data = await res.json();
      setIsOnline(Boolean(data.isOnline));
    } catch {}
  };

  const toggleAvailability = async () => {
    setBusy(true);
    const targetState = !isOnline;
    try {
      const res = await fetch("/api/mentor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: targetState }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsOnline(Boolean(data.isOnline));
        setMessage({
          text: `You are now ${data.isOnline ? "Online and accepting doubt-clearing calls" : "Offline"}.`,
          type: data.isOnline ? "success" : "info",
        });
      } else {
        setMessage({ text: data.error || "Failed to update availability status.", type: "error" });
      }
    } catch {
      setMessage({ text: "Unable to reach availability service.", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const acceptSession = async (session) => {
    if (!isOnline) {
      setMessage({ text: "You are offline. Go Online first to accept sessions.", type: "error" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/mentor/sessions/${session.id}/accept`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (res.ok) {
        setActiveRoom(session.roomId);
        setActiveSession({ ...session, status: "Accepted" });
        setMessage({ text: `Accepted session with ${session.student?.name || "Student"}. Connecting...`, type: "success" });
        await loadSessionsSilently();
      } else {
        setMessage({ text: data.error || "Unable to accept this session.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error while accepting session.", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/mentor/sessions/${activeSession.id}/end`, {
        method: "PATCH",
      });
      if (res.ok) {
        setActiveRoom(null);
        setActiveSession(null);
        setMentorNotes("");
        setMessage({ text: "Session completed and closed successfully.", type: "success" });
        await loadSessionsSilently();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Unable to end session.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error ending session.", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  // Filtered session lists
  const waitingSessions = useMemo(
    () => sessions.filter((s) => s.status === "Waiting" || s.status === "Assigned"),
    [sessions]
  );

  const activeSessions = useMemo(
    () => sessions.filter((s) => s.status === "Accepted" || s.status === "Active"),
    [sessions]
  );

  const completedSessions = useMemo(
    () => sessions.filter((s) => s.status === "Ended"),
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    let pool = [];
    if (activeTab === "waiting") pool = waitingSessions;
    else if (activeTab === "active") pool = activeSessions;
    else pool = completedSessions;

    if (!searchQuery.trim()) return pool;
    const q = searchQuery.toLowerCase();
    return pool.filter(
      (s) =>
        s.student?.name?.toLowerCase().includes(q) ||
        s.student?.email?.toLowerCase().includes(q) ||
        s.context?.toLowerCase().includes(q)
    );
  }, [activeTab, waitingSessions, activeSessions, completedSessions, searchQuery]);

  // Loading state
  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f8fc] p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#7564ed]/20 border-t-[#7564ed]" />
          <p className="text-sm font-bold text-[#46516c]">Setting up your mentor desk…</p>
        </div>
      </main>
    );
  }

  // Unauthenticated state
  if (status === "unauthenticated") {
    return (
      <>
        <SiteHeader active="Mentor Desk" />
        <main className="grid min-h-[calc(100vh-140px)] place-items-center bg-[#f7f8fc] p-6">
          <section className="w-full max-w-md rounded-2xl border border-[#e4e8f1] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0edff] text-[#7564ed]">
              <Shield size={28} />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-[#18223c]">Mentor Login Required</h1>
            <p className="mt-2 text-sm leading-6 text-[#73809b]">
              Your live doubt-clearing desk is accessible only to authenticated mentors.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#5254db]"
            >
              Sign In with Mentor Account <ArrowRight size={16} />
            </Link>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  // Forbidden state
  if (status === "forbidden") {
    return (
      <>
        <SiteHeader active="Mentor Desk" />
        <main className="grid min-h-[calc(100vh-140px)] place-items-center bg-[#f7f8fc] p-6">
          <section className="w-full max-w-md rounded-2xl border border-[#e4e8f1] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fee2e2] text-[#dc2626]">
              <AlertCircle size={28} />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-[#18223c]">Mentor Access Only</h1>
            <p className="mt-2 text-sm leading-6 text-[#73809b]">
              This portal is reserved for registered mentors. You are currently logged in with a student account.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#5254db]"
              >
                Go to Student Dashboard
              </Link>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#dfe5ef] bg-white px-5 py-3 text-sm font-bold text-[#46516c] hover:bg-[#f7f8fc]"
              >
                Switch Account
              </Link>
            </div>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader active="Mentor Desk" />
      <main className="min-h-screen bg-[#f7f8fc] pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          {/* Header section */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#f0edff] px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-[#6353c6] uppercase">
                  <Shield size={11} /> MENTOR DESK
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isOnline ? "bg-[#e4f8f5] text-[#247b70]" : "bg-[#fef3c7] text-[#92400e]"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isOnline ? "bg-[#2c967b] animate-pulse" : "bg-[#d97706]"
                    }`}
                  />
                  {isOnline ? "Online & Ready" : "Offline"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18223c]">
                Live Doubt Clearing Desk
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[#73809b]">
                Accept live 1-on-1 video calls from JEE aspirants, guide conceptual breakthroughs, and track resolutions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleAvailability}
                disabled={busy}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition disabled:opacity-60 ${
                  isOnline
                    ? "bg-[#2c967b] text-white hover:bg-[#25826a]"
                    : "bg-[#7564ed] text-white hover:bg-[#6655df]"
                }`}
              >
                <Radio size={15} className={isOnline ? "animate-pulse" : ""} />
                {busy ? "Updating…" : isOnline ? "Go Offline" : "Go Online (Accept Calls)"}
              </button>

              <button
                type="button"
                onClick={loadSessions}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe5ef] bg-white px-3.5 py-2.5 text-sm font-bold text-[#46516c] hover:bg-[#f7f8fc] transition shadow-xs disabled:opacity-50"
                title="Refresh sessions list"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Offline alert banner */}
          {!isOnline && (
            <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3">
                <Clock size={20} className="text-[#b45309] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-[#92400e]">You are currently offline</h3>
                  <p className="text-xs text-[#b45309] mt-0.5">
                    Students will not see you in the active mentor pool. Click &ldquo;Go Online&rdquo; to start receiving live video doubt-clearing calls.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleAvailability}
                disabled={busy}
                className="rounded-xl bg-[#d97706] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#b45309] transition shadow-xs"
              >
                Go Online Now
              </button>
            </div>
          )}

          {/* Flash message banner */}
          {message && (
            <div
              className={`rounded-xl p-3.5 mb-6 flex items-center justify-between text-xs sm:text-sm font-bold shadow-xs ${
                message.type === "success"
                  ? "bg-[#e4f8f5] text-[#247b70] border border-[#a7f3d0]"
                  : message.type === "error"
                  ? "bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]"
                  : "bg-[#e0e7ff] text-[#3730a3] border border-[#c7d2fe]"
              }`}
            >
              <div className="flex items-center gap-2">
                {message.type === "success" ? (
                  <CheckCircle size={16} />
                ) : message.type === "error" ? (
                  <AlertCircle size={16} />
                ) : (
                  <CircleDot size={16} />
                )}
                <span>{message.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setMessage(null)}
                className="p-1 hover:opacity-70"
                aria-label="Dismiss alert"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="rounded-2xl border border-[#e4e8f1] bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold tracking-wider text-[#8993ac] uppercase">
                  WAITING QUEUE
                </p>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#f0edff] text-[#7564ed]">
                  <MessageSquare size={16} />
                </span>
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#18223c]">
                {waitingSessions.length}
              </p>
              <p className="mt-1 text-[11px] text-[#73809b]">Students asking for help</p>
            </div>

            <div className="rounded-2xl border border-[#e4e8f1] bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold tracking-wider text-[#8993ac] uppercase">
                  ACTIVE CALLS
                </p>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#e4f8f5] text-[#247b70]">
                  <Video size={16} />
                </span>
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#18223c]">
                {activeSessions.length}
              </p>
              <p className="mt-1 text-[11px] text-[#73809b]">In-call sessions right now</p>
            </div>

            <div className="rounded-2xl border border-[#e4e8f1] bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold tracking-wider text-[#8993ac] uppercase">
                  DOUBTS CLEARED
                </p>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#fef3c7] text-[#b45309]">
                  <Award size={16} />
                </span>
              </div>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#18223c]">
                {completedSessions.length}
              </p>
              <p className="mt-1 text-[11px] text-[#73809b]">Total sessions resolved</p>
            </div>

            <div className="rounded-2xl border border-[#e4e8f1] bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold tracking-wider text-[#8993ac] uppercase">
                  STATUS
                </p>
                <span
                  className={`grid h-8 w-8 place-items-center rounded-xl ${
                    isOnline ? "bg-[#e4f8f5] text-[#247b70]" : "bg-[#fef3c7] text-[#92400e]"
                  }`}
                >
                  <UserCheck size={16} />
                </span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-extrabold text-[#18223c]">
                {isOnline ? "Available" : "Offline"}
              </p>
              <p className="mt-1 text-[11px] text-[#73809b]">
                {isOnline ? "Accepting student video" : "Not matched to doubts"}
              </p>
            </div>
          </div>

          {/* Main workspace layout */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column: Sessions List & Queues */}
            <div className="lg:col-span-5 space-y-5">
              <section className="rounded-2xl border border-[#e4e8f1] bg-white p-5 shadow-sm">
                {/* Tabs */}
                <div className="flex items-center justify-between border-b border-[#edf0f5] pb-3 mb-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("waiting")}
                      className={`relative rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === "waiting"
                          ? "bg-[#7564ed] text-white"
                          : "text-[#64728d] hover:bg-[#f7f8fc]"
                      }`}
                    >
                      Waiting ({waitingSessions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("active")}
                      className={`relative rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === "active"
                          ? "bg-[#7564ed] text-white"
                          : "text-[#64728d] hover:bg-[#f7f8fc]"
                      }`}
                    >
                      In Call ({activeSessions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("history")}
                      className={`relative rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === "history"
                          ? "bg-[#7564ed] text-white"
                          : "text-[#64728d] hover:bg-[#f7f8fc]"
                      }`}
                    >
                      History ({completedSessions.length})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={loadSessions}
                    className="text-xs font-bold text-[#7564ed] hover:underline"
                  >
                    Refresh
                  </button>
                </div>

                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search by student name or topic..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3.5 py-2 text-xs outline-none focus:border-[#7564ed] focus:ring-2 focus:ring-[#7564ed]/15"
                  />
                </div>

                {/* List items */}
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    {activeTab === "waiting" ? (
                      <>
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f0edff] text-[#7564ed] mb-3">
                          <Sparkles size={24} />
                        </div>
                        <h4 className="text-sm font-extrabold text-[#27314c]">No students in queue</h4>
                        <p className="mt-1 text-xs text-[#73809b] max-w-xs mx-auto">
                          When students practicing JEE questions or using the AI tutor request a mentor, their doubts appear here in real time.
                        </p>
                      </>
                    ) : activeTab === "active" ? (
                      <>
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e4f8f5] text-[#247b70] mb-3">
                          <Video size={24} />
                        </div>
                        <h4 className="text-sm font-extrabold text-[#27314c]">No active sessions</h4>
                        <p className="mt-1 text-xs text-[#73809b]">
                          Accept a student from the waiting queue to launch a live video call.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#edf0f5] text-[#64728d] mb-3">
                          <BookOpen size={24} />
                        </div>
                        <h4 className="text-sm font-extrabold text-[#27314c]">No session history yet</h4>
                        <p className="mt-1 text-xs text-[#73809b]">
                          Completed doubt-clearing sessions will be archived here for your records.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[640px] overflow-y-auto pr-1">
                    {filteredSessions.map((session) => {
                      const studentName = session.student?.name || "Student";
                      const studentEmail = session.student?.email || "";
                      const isSessionActive = activeSession?.id === session.id;

                      return (
                        <div
                          key={session.id}
                          className={`rounded-2xl border p-4 transition ${
                            isSessionActive
                              ? "border-[#7564ed] bg-[#f7f5ff] shadow-sm"
                              : "border-[#dfe5ef] bg-[#fafbfe] hover:border-[#cbd5e1] hover:bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-full bg-[#7564ed] text-white flex items-center justify-center text-xs font-extrabold shrink-0 shadow-xs">
                                {(studentName.charAt(0) || "S").toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-[#1e293b] leading-tight">
                                  {studentName}
                                </h4>
                                <p className="text-[11px] text-[#73809b] truncate max-w-[180px]">
                                  {studentEmail}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                session.status === "Waiting"
                                  ? "bg-[#fef3c7] text-[#92400e]"
                                  : session.status === "Assigned"
                                  ? "bg-[#f0edff] text-[#6353c6]"
                                  : session.status === "Accepted" || session.status === "Active"
                                  ? "bg-[#e4f8f5] text-[#247b70]"
                                  : "bg-[#edf0f5] text-[#64728d]"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  session.status === "Waiting"
                                    ? "bg-[#d97706]"
                                    : session.status === "Assigned"
                                    ? "bg-[#7564ed]"
                                    : session.status === "Accepted" || session.status === "Active"
                                    ? "bg-[#2c967b] animate-pulse"
                                    : "bg-[#94a3b8]"
                                }`}
                              />
                              {session.status}
                            </span>
                          </div>

                          {session.context && (
                            <div className="rounded-xl border border-[#e4e8f1] bg-white p-2.5 mb-3 text-xs text-[#46516c] leading-relaxed">
                              <span className="font-extrabold text-[9px] uppercase tracking-wider text-[#8993ac] block mb-1">
                                Doubt Details
                              </span>
                              <p className="line-clamp-3 italic">&ldquo;{session.context}&rdquo;</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-[#94a3b8] flex items-center gap-1">
                              <Clock size={11} />
                              {session.startedAt
                                ? new Date(session.startedAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Just now"}
                            </span>

                            {session.status === "Waiting" || session.status === "Assigned" ? (
                              <button
                                type="button"
                                onClick={() => acceptSession(session)}
                                disabled={busy || !isOnline}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition ${!isOnline ? "bg-[#94a3b8] disabled:opacity-50" : "bg-[#7564ed] hover:bg-[#6655df] disabled:opacity-50"}`}
                              >
                                <Video size={13} /> {isOnline ? "Accept Call" : "Go Online First"}
                              </button>
                            ) : session.status === "Accepted" || session.status === "Active" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveRoom(session.roomId);
                                  setActiveSession(session);
                                }}
                                disabled={!isOnline}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition ${!isOnline ? "bg-[#94a3b8]" : "bg-[#2c967b] hover:bg-[#25826a]"}`}
                              >
                                <Video size={13} /> {isOnline ? "Join Call" : "Go Online First"}
                              </button>
                            ) : (
                              <span className="text-[11px] font-bold text-[#64728d]">Ended</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Right Column: Live Video Workspace or Readiness Center */}
            <div className="lg:col-span-7 space-y-6">
              {activeRoom && activeSession ? (
                <div className="space-y-4">
                  {/* Live Video Call Component */}
                  <VideoCall
                    roomId={activeRoom}
                    studentName={activeSession.student?.name || "Student"}
                    studentEmail={activeSession.student?.email || ""}
                    context={activeSession.context || ""}
                    onEnd={endSession}
                    isMentor={true}
                  />

                  {/* Active Doubt Context & Mentor Scratchpad */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <section className="rounded-2xl border border-[#e4e8f1] bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <HelpCircle size={16} className="text-[#7564ed]" />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#7564ed]">
                          Student&apos;s Doubt Context
                        </h4>
                      </div>
                      <p className="text-xs text-[#46516c] leading-relaxed whitespace-pre-wrap bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0]">
                        {activeSession.context || "No written doubt context provided by the student."}
                      </p>
                    </section>

                    <section className="rounded-2xl border border-[#e4e8f1] bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={16} className="text-[#7564ed]" />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#7564ed]">
                          Mentor Scratchpad
                        </h4>
                      </div>
                      <textarea
                        rows={3}
                        value={mentorNotes}
                        onChange={(e) => setMentorNotes(e.target.value)}
                        placeholder="Write formulas, key step reminders, or homework pointers for this student..."
                        className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-2.5 text-xs outline-none focus:border-[#7564ed] focus:ring-2 focus:ring-[#7564ed]/15 resize-none"
                      />
                    </section>
                  </div>
                </div>
              ) : (
                /* Ready State & Mentor Resource Center */
                <div className="space-y-6">
                  <section className="rounded-2xl border border-[#e4e8f1] bg-white p-6 sm:p-8 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f0edff] text-[#7564ed] shrink-0">
                        <Video size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-[#18223c]">
                          Welcome, {user?.name || "Mentor"}!
                        </h3>
                        <p className="mt-1 text-xs sm:text-sm text-[#73809b] leading-relaxed">
                          Your live video call will start here immediately once you accept a student&apos;s doubt from the waiting queue on the left.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-[#edf0f5] bg-[#fafbfe] p-5">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#6353c6] mb-3">
                        Doubt Clearing Checklist
                      </h4>
                      <ul className="space-y-2.5 text-xs text-[#46516c]">
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#2c967b] shrink-0 mt-0.5" />
                          <span>Ensure your microphone and camera have system permissions.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#2c967b] shrink-0 mt-0.5" />
                          <span>Check that your status is set to <strong>Online</strong> so students can match with you.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#2c967b] shrink-0 mt-0.5" />
                          <span>Ask the student where their understanding broke down before diving straight into the derivation.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={14} className="text-[#2c967b] shrink-0 mt-0.5" />
                          <span>Recommend 1 or 2 targeted PYQ questions once the concept is clear.</span>
                        </li>
                      </ul>
                    </div>
                  </section>

                  {/* Best Practices Banner */}
                  <section className="rounded-2xl border border-[#dcd8fb] bg-gradient-to-r from-[#f4f1ff] to-white p-6 shadow-xs">
                    <div className="flex items-start gap-3">
                      <Sparkles size={20} className="text-[#7564ed] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-extrabold text-[#27314c]">
                          JEE Mentoring Best Practices
                        </h4>
                        <p className="mt-1 text-xs text-[#59647d] leading-relaxed">
                          Aim to keep 1-on-1 calls focused between 10 to 15 minutes. Emphasize the core physics principle, reaction mechanism, or mathematical theorem so the student gains self-reliance for their exams.
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
