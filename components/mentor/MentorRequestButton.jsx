"use client";

import { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  Video as VideoIcon,
  PhoneCall,
  X,
  User,
  CheckCircle2,
  Bell,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { VideoCall } from "@/components/video/VideoCall";

// Soft notification chime using Web Audio API
function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First tone (C5 - 523 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second tone (E5 - 659 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.frequency.setValueAtTime(659.25, now + 0.18);
    gain2.gain.setValueAtTime(0.18, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.55);
  } catch {}
}

export default function MentorRequestButton({ question = "", subject = "", chapter = "" }) {
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [status, setStatus] = useState(""); // 'Waiting' | 'Assigned' | 'Accepted' | 'Active' | 'Ended'
  const [mentor, setMentor] = useState(null);
  const [error, setError] = useState("");
  const [inCall, setInCall] = useState(false);
  const [showAcceptedModal, setShowAcceptedModal] = useState(false);
  const [sessionNotice, setSessionNotice] = useState("");

  const pollTimerRef = useRef(null);
  const prevStatusRef = useRef("");
  const roomIdRef = useRef(null);
  const inCallRef = useRef(false);
  const requestedRef = useRef(false);

  // Keep refs up-to-date
  useEffect(() => {
    roomIdRef.current = roomId;
    inCallRef.current = inCall;
    requestedRef.current = requested;
  }, [roomId, inCall, requested]);

  // Auto-clear notice after 7 seconds
  useEffect(() => {
    if (!sessionNotice) return;
    const timer = setTimeout(() => setSessionNotice(""), 7000);
    return () => clearTimeout(timer);
  }, [sessionNotice]);

  // BroadcastChannel sync across browser tabs: instant disconnection when mentor ends
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const bc = new BroadcastChannel("jee-doubt-sessions");

    bc.onmessage = (event) => {
      const data = event.data;
      if (data?.type === "SESSION_ENDED_BY_MENTOR") {
        if (!roomIdRef.current || data.roomId === roomIdRef.current) {
          setInCall(false);
          setShowAcceptedModal(false);
          setRequested(false);
          setRoomId(null);
          roomIdRef.current = null;
          setStatus("");
          setMentor(null);
          prevStatusRef.current = "";
          setSessionNotice("Mentor completed and closed the doubt session.");
          playChime();
        }
      }
    };

    return () => {
      try { bc.close(); } catch {}
    };
  }, []);

  // Handle browser tab close or reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (roomIdRef.current && (inCallRef.current || requestedRef.current)) {
        try {
          const bc = new BroadcastChannel("jee-doubt-sessions");
          bc.postMessage({ type: "SESSION_ENDED_BY_STUDENT", roomId: roomIdRef.current });
          bc.close();
        } catch {}

        try {
          if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify({ action: "end", roomId: roomIdRef.current })], {
              type: "application/json",
            });
            navigator.sendBeacon("/api/student/session", blob);
          }
        } catch {}
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Poll for mentor status when requested or in-call
  useEffect(() => {
    if (!requested && !inCall && !roomId) return;

    const poll = async () => {
      try {
        const currentRoom = roomIdRef.current;
        const url = currentRoom
          ? `/api/student/session?roomId=${encodeURIComponent(currentRoom)}`
          : "/api/student/session";
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();

        if (data.session) {
          const newStatus = data.session.status;
          setStatus(newStatus);
          if (data.session.mentor) {
            setMentor(data.session.mentor);
          }

          // Trigger alert when mentor accepts!
          if (
            (newStatus === "Accepted" || newStatus === "Active") &&
            prevStatusRef.current !== "Accepted" &&
            prevStatusRef.current !== "Active"
          ) {
            playChime();
            setShowAcceptedModal(true);
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              try {
                new Notification("JEE Compass Doubt Cleared!", {
                  body: `Mentor ${data.session.mentor?.name || ""} accepted your doubt and is waiting in the video room.`,
                  icon: "/favicon.ico",
                });
              } catch {}
            }
          }

          // If session was ended or cancelled by mentor
          if (newStatus === "Ended" || newStatus === "Cancelled") {
            setInCall(false);
            setShowAcceptedModal(false);
            setRequested(false);
            setRoomId(null);
            roomIdRef.current = null;
            setStatus("");
            setMentor(null);
            prevStatusRef.current = "";
            setSessionNotice("Mentor completed and closed the doubt session.");
            playChime();
          } else {
            prevStatusRef.current = newStatus;
          }
        } else if ((requestedRef.current || inCallRef.current) && prevStatusRef.current) {
          // Session was closed/removed from backend
          setInCall(false);
          setShowAcceptedModal(false);
          setRequested(false);
          setRoomId(null);
          roomIdRef.current = null;
          setStatus("");
          setMentor(null);
          prevStatusRef.current = "";
          setSessionNotice("The doubt session has ended.");
        }
      } catch {}
    };

    poll();
    // Poll fast (every 2 seconds) during active calls or waiting
    pollTimerRef.current = setInterval(poll, 2000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [requested, inCall, roomId]);

  const requestMentor = async () => {
    setBusy(true);
    setError("");
    setSessionNotice("");

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      try {
        Notification.requestPermission();
      } catch {}
    }

    try {
      const context = [
        question ? `Question: ${question}` : "",
        subject ? `Subject: ${subject}` : "",
        chapter ? `Chapter: ${chapter}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const response = await fetch("/api/student/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to request mentor.");

      setRoomId(data.roomId);
      roomIdRef.current = data.roomId;
      setStatus(data.status || "Waiting");
      prevStatusRef.current = data.status || "Waiting";
      setRequested(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect to mentor. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = async () => {
    const currentRoom = roomIdRef.current || roomId;
    setRequested(false);
    setRoomId(null);
    roomIdRef.current = null;
    setStatus("");
    setMentor(null);
    setInCall(false);
    setShowAcceptedModal(false);
    prevStatusRef.current = "";

    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("jee-doubt-sessions");
        bc.postMessage({ type: "SESSION_CANCELLED", roomId: currentRoom });
        bc.close();
      }
    } catch {}

    try {
      await fetch(`/api/student/session?roomId=${encodeURIComponent(currentRoom || "")}`, {
        method: "DELETE",
      });
    } catch {}
  };

  // Called when the student leaves the video call
  const handleEndCall = async () => {
    const currentRoom = roomIdRef.current || roomId;

    // Immediately terminate call on student UI
    setInCall(false);
    setShowAcceptedModal(false);
    setRequested(false);
    setRoomId(null);
    roomIdRef.current = null;
    setStatus("");
    setMentor(null);
    prevStatusRef.current = "";
    setSessionNotice("You left and ended the doubt session.");

    // Broadcast event to mentor tab immediately
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("jee-doubt-sessions");
        bc.postMessage({ type: "SESSION_ENDED_BY_STUDENT", roomId: currentRoom });
        bc.close();
      }
    } catch {}

    // Tell backend to end session so mentor also leaves automatically
    try {
      await fetch("/api/student/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end", roomId: currentRoom }),
      });
    } catch {}
  };

  const isAccepted = status === "Accepted" || status === "Active";

  return (
    <div className="w-full">
      {/* Informative notice banner (e.g. Mentor ended session / Student ended session) */}
      {sessionNotice && (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-[#e4f8f5] border border-[#a7f3d0] p-3 text-xs font-bold text-[#247b70] shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#2c967b] shrink-0" />
            <span>{sessionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSessionNotice("")}
            className="p-1 hover:opacity-70 text-[#247b70]"
            aria-label="Dismiss notice"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. Modal Dialog when mentor accepts */}
      {showAcceptedModal && !inCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#dfe5ef] text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e4f8f5] text-[#247b70] mb-4 shadow-sm animate-bounce">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="text-xl font-extrabold text-[#18223c]">
              Doubt Accepted by Mentor!
            </h3>
            <p className="mt-2 text-sm text-[#46516c] leading-relaxed">
              <strong className="text-[#18223c]">{mentor?.name || "Your mentor"}</strong> has accepted your doubt session and is waiting in the video room.
            </p>

            {question && (
              <div className="mt-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-3 text-xs text-[#64728d] text-left italic line-clamp-2">
                &ldquo;{question}&rdquo;
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowAcceptedModal(false);
                  setInCall(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#2c967b] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#25826a] transition"
              >
                <VideoIcon size={16} /> Join Live Video Call Now
              </button>
              <button
                type="button"
                onClick={() => setShowAcceptedModal(false)}
                className="w-full rounded-xl border border-[#dfe5ef] bg-white px-4 py-2 text-xs font-bold text-[#64728d] hover:bg-[#f7f8fc]"
              >
                Keep in Background
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Fullscreen Video Call overlay */}
      {inCall && roomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 md:p-6 backdrop-blur-xs">
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <VideoCall
              roomId={roomId}
              studentName={mentor?.name || "Mentor"}
              studentEmail={mentor?.email || ""}
              context={`Question: ${question || subject || "Live Doubt Session"}`}
              onEnd={handleEndCall}
              isMentor={false}
            />
          </div>
        </div>
      )}

      {/* 3. Waiting / Accepted Banner card */}
      {requested && roomId ? (
        <div className="rounded-2xl border border-[#dfe5ef] bg-[#f0edff] p-4 text-left shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-xs ${
                  isAccepted ? "bg-[#2c967b] text-white" : "bg-[#7564ed] text-white"
                }`}
              >
                {isAccepted ? <PhoneCall size={18} /> : <VideoIcon size={18} />}
              </div>
              <div>
                <p className="text-sm font-bold text-[#27314c]">
                  {isAccepted
                    ? `Mentor ${mentor?.name || "Rajesh Sharma"} is ready!`
                    : "Mentor request sent"}
                </p>
                <p className="text-xs text-[#73809b] mt-0.5">
                  {isAccepted
                    ? "Your mentor has accepted your doubt. Click below to enter the live room."
                    : "An online mentor will pick up your doubt shortly. You can wait or keep practicing."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={cancelRequest}
              className="rounded-lg p-1 text-[#8993ac] hover:bg-white hover:text-[#46516c] transition"
              title="Cancel and reset request"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#e2ddf8] pt-3">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold ${
                  isAccepted
                    ? "bg-[#e4f8f5] text-[#247b70]"
                    : "bg-white text-[#5e4bc1] border border-[#dcd6f7]"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isAccepted ? "bg-[#2c967b]" : "bg-[#7564ed] animate-pulse"
                  }`}
                />
                {isAccepted ? "Mentor In Room" : "Waiting for mentor…"}
              </span>
              <span className="text-[11px] text-[#8993ac] font-mono">
                Room: {roomId.slice(0, 14)}…
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRequest}
                className="rounded-xl border border-[#dcd6f7] bg-white px-3 py-1.5 text-xs font-bold text-[#64728d] hover:bg-[#faf9ff] transition"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setInCall(true)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition ${
                  isAccepted
                    ? "bg-[#2c967b] hover:bg-[#25826a] animate-pulse"
                    : "bg-[#7564ed] hover:bg-[#6655df]"
                }`}
              >
                <VideoIcon size={14} /> {isAccepted ? "Join Video Call Now" : "Open Video Room"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 4. Default Request Button */
        <div>
          <button
            type="button"
            onClick={requestMentor}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#e6e1f7] bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-[#5e4bc1] shadow-xs transition hover:bg-[#f7f5ff] hover:border-[#bcb2f0] disabled:opacity-50"
          >
            <MessageCircle size={15} />
            {busy ? "Connecting to mentor…" : "Request Live Mentor (1-on-1 Video)"}
          </button>
          {error && <p className="mt-2 text-xs font-semibold text-[#dc2626] text-center">{error}</p>}
        </div>
      )}
    </div>
  );
}

export { MentorRequestButton };
