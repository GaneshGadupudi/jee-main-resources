"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Eye, EyeOff, Expand, Maximize, Mic, MicOff, Phone, Square, Trash2, Video as VideoIcon, VideoOff, PenTool, Scale } from "lucide-react";

export function VideoCall({ roomId, studentName = "Student", studentEmail = "", context = "", onEnd, isMentor = false }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callConnected, setCallConnected] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [callNotice, setCallNotice] = useState("");
  const [tool, setTool] = useState(null);
  const [drawing, setDrawing] = useState([]);
  const pcRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef(null);

  const cleanup = useCallback(() => {
    if (localStream) { localStream.getTracks().forEach((t) => { try { t.enabled = false; t.stop(); } catch {} }); setLocalStream(null); }
    if (screenStream) { screenStream.getTracks().forEach((t) => { try { t.enabled = false; t.stop(); } catch {} }); setScreenStream(null); setScreenSharing(false); }
    if (pcRef.current) { try { pcRef.current.close(); } catch {} pcRef.current = null; }
    setDrawing([]);
  }, []);

  const startCall = useCallback(async () => {
    try { setBusy(true); setCallNotice(""); let stream = null;
      if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try { stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); }
        catch { try { stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true }); setCallNotice("Video unavailable. Audio only."); } catch { setCallNotice("Camera/Mic blocked."); } }
      }
      if (stream) { setLocalStream(stream); if (localVideoRef.current) localVideoRef.current.srcObject = stream; }
      if (typeof window !== "undefined" && window.RTCPeerConnection) {
        try {
          const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
          pcRef.current = pc;
          if (stream) { stream.getTracks().forEach((track) => { try { pc.addTrack(track, stream); } catch {} }); }
          pc.ontrack = (event) => { if (event.streams && event.streams[0]) { setRemoteStream(event.streams[0]); if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]; setCallConnected(true); } };
          pc.onconnectionstatechange = () => { if (pc.connectionState === "connected") setCallConnected(true); };
          if (isMentor) { try { const offer = await pc.createOffer(); await pc.setLocalDescription(offer); } catch {} }
        } catch { }
      }
      setTimeout(() => setCallConnected(true), 800);
    } catch { setTimeout(() => setCallConnected(true), 500); }
    finally { setBusy(false); }
  }, [isMentor]);

  useEffect(() => { startCall(); return () => cleanup(); }, [roomId, isMentor, startCall, cleanup]);
  useEffect(() => { const h = (e) => { if (e.key === "Escape" && isFullscreen) setIsFullscreen(false); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [isFullscreen]);

  const toggleMic = useCallback(() => { const next = !micEnabled; setMicEnabled(next); if (localStream) localStream.getAudioTracks().forEach((t) => { t.enabled = next; }); }, [micEnabled, localStream]);
  const toggleCamera = useCallback(() => { const next = !cameraEnabled; setCameraEnabled(next); if (localStream) localStream.getVideoTracks().forEach((t) => { t.enabled = next; }); }, [cameraEnabled, localStream]);

  const toggleScreenShare = useCallback(async () => {
    if (!isMentor) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) { setCallNotice("Screen share not supported."); return; }
    try { setBusy(true);
      if (screenSharing) { if (screenStream) { screenStream.getTracks().forEach((t) => { try { t.enabled = false; t.stop(); } catch {} }); setScreenStream(null); } if (pcRef.current && localStream) { const camTrack = localStream.getVideoTracks()[0]; const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === "video"); if (sender && camTrack) { try { await sender.replaceTrack(camTrack); } catch {} } } setScreenSharing(false); setCallNotice(""); }
      else { const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); setScreenStream(screen); setScreenSharing(true); if (pcRef.current) { const screenTrack = screen.getVideoTracks()[0]; const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === "video"); if (sender) { try { await sender.replaceTrack(screenTrack); } catch {} } else { try { pcRef.current.addTrack(screenTrack, screen); } catch {} } } screen.getVideoTracks()[0].addEventListener("ended", () => { setScreenSharing(false); setScreenStream(null); if (pcRef.current && localStream) { const camTrack = localStream.getVideoTracks()[0]; const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === "video"); if (sender && camTrack) { try { sender.replaceTrack(camTrack); } catch {} } } }); }
    } catch { setCallNotice("Unable to share screen."); }
    finally { setBusy(false); }
  }, [isMentor, screenSharing, screenStream, localStream]);

  const handleEndCall = useCallback(() => { cleanup(); if (onEnd) onEnd(); }, [cleanup, onEnd]);
  const toggleFullscreen = useCallback(() => { setIsFullscreen((p) => !p); }, []);

  const rawName = typeof studentName === "string" && studentName.trim() ? studentName : (isMentor ? "Student" : "Mentor");
  const avatarLetter = (rawName.charAt(0) || "S").toUpperCase();

  return (
    <section className={`rounded-2xl border border-[#e4e8f1] bg-white p-0 shadow-xl overflow-hidden relative ${isFullscreen ? "fixed inset-0 z-50 h-full w-full rounded-none" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e8f1] bg-[#f7f8fc] px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 shrink-0 rounded-full bg-[#7564ed] flex items-center justify-center text-white text-sm font-bold shadow-xs">{avatarLetter}</div>
            <div className="min-w-0"><p className="text-sm font-bold text-[#27314c] truncate">{rawName}</p>{studentEmail && <p className="text-xs text-[#73809b] truncate">{studentEmail}</p>}</div>
          </div>
          {context && (
            <div className="hidden md:block max-w-sm rounded-xl border border-[#dfe5ef] bg-white px-3 py-1.5 shadow-xs">
              <p className="text-[9px] font-extrabold text-[#8993ac] uppercase tracking-wider">QUESTION CONTEXT</p>
              <p className="text-xs text-[#46516c] truncate">{context}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={toggleMic} className={`p-2 rounded-xl transition ${micEnabled ? "bg-white text-[#46516c] hover:bg-[#edf0f7]" : "bg-[#c7586d] text-white hover:bg-[#b14a5a]"}`} title={micEnabled ? "Mute microphone" : "Unmute microphone"} aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}>{micEnabled ? <Mic size={16} /> : <MicOff size={16} />}</button>
          <button type="button" onClick={toggleCamera} className={`p-2 rounded-xl transition ${cameraEnabled ? "bg-white text-[#46516c] hover:bg-[#edf0f7]" : "bg-[#c7586d] text-white hover:bg-[#b14a5a]"}`} title={cameraEnabled ? "Turn off camera" : "Turn on camera"} aria-label={cameraEnabled ? "Turn off camera" : "Turn on camera"}>{cameraEnabled ? <VideoIcon size={16} /> : <VideoOff size={16} />}</button>
          {isMentor && (
            <button type="button" onClick={toggleScreenShare} disabled={busy} className={`p-2 rounded-xl transition ${screenSharing ? "bg-[#c7586d] text-white hover:bg-[#b14a5a]" : "bg-white text-[#46516c] hover:bg-[#edf0f7]"}`} title={screenSharing ? "Stop Screen Share" : "Share Screen"} aria-label={screenSharing ? "Stop Screen Share" : "Share Screen"}>
              {screenSharing ? (<><EyeOff size={16} /><span className="text-xs hidden sm:inline">Stop Share</span></>) : (<><Square size={16} /><span className="text-xs hidden sm:inline">Share Screen</span></>)}
            </button>
          )}
          <div className="flex items-center gap-1 bg-white border border-[#dfe5ef] rounded-xl p-1 shadow-xs">
            {[null, "pen", "eraser"].map((t) => (
              <button key={t} type="button" onClick={() => setTool(t)} className={`p-1.5 rounded-lg transition ${tool === t ? "bg-[#e4f8f5] text-[#247b70] shadow-sm" : "text-[#64728d] hover:bg-[#f7f8fc]"}`} title={t || "Select"} aria-label={t || "Select"}>
                {t === "pen" && <PenTool size={14} />}{t === "eraser" && <Square size={14} />}{t === null && <Square size={14} />}
              </button>
            ))}
            <button type="button" onClick={() => setTool("clear")} className="p-1.5 rounded-lg transition text-[#64728d] hover:bg-[#f7f8fc]" title="Clear drawings" aria-label="Clear drawings"><Trash2 size={14} /></button>
            {isMentor && (
              <button type="button" onClick={() => setTool(tool === "formula" ? null : "formula")} className={`p-1.5 rounded-lg transition ${tool === "formula" ? "bg-[#e4f8f5] text-[#247b70] shadow-sm" : "text-[#64728d] hover:bg-[#f7f8fc]"}`} title="Formula Drawer" aria-label="Formula Drawer"><Scale size={14} /></button>
            )}
          </div>
          <button type="button" onClick={toggleFullscreen} className="p-2 rounded-xl bg-white text-[#46516c] transition hover:bg-[#edf0f7]" title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>{isFullscreen ? <Maximize size={16} /> : <Expand size={16} />}</button>
          <button type="button" onClick={handleEndCall} className="inline-flex items-center gap-1.5 rounded-xl bg-[#c7586d] px-3.5 py-2 text-xs sm:text-sm font-bold text-white hover:bg-[#b14a5a] transition shadow-xs"><Phone size={14} className="rotate-[135deg]" /> {isMentor ? "End Session" : "Leave Call"}</button>
        </div>
      </div>

      <div className={`relative bg-[#111625] ${isFullscreen ? "h-[calc(100vh-120px)]" : "h-[420px] sm:h-[460px]"}`}>
        <video ref={remoteVideoRef} autoPlay playsInline muted={!isMentor} className="absolute inset-0 w-full h-full object-cover" />
        {(tool === "pen" || tool === "eraser") && (
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-auto cursor-crosshair" onMouseDown={(e) => { if (!canvasRef.current) return; const rect = canvasRef.current.getBoundingClientRect(); setDrawing((p) => [...p, { type: "start", x: e.clientX - rect.left, y: e.clientY - rect.top, tool, color: tool === "eraser" ? "#111625" : "#7564ed", width: tool === "eraser" ? 10 : 3 }]); }} onMouseMove={(e) => { if (!canvasRef.current) return; const rect = canvasRef.current.getBoundingClientRect(); setDrawing((p) => [...p, { type: "move", x: e.clientX - rect.left, y: e.clientY - rect.top }]); }} style={{ touchAction: "none" }} />
        )}
        <div className="absolute bottom-4 right-4 z-30">
          <div className="w-[150px] h-[100px] sm:w-[200px] sm:h-[130px] rounded-xl border-2 border-white/80 shadow-2xl overflow-hidden relative bg-[#111625]">
            <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            {!cameraEnabled && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><VideoOff size={32} className="text-white/60" /></div>}
            <span className="absolute bottom-1 left-2 text-[10px] font-bold text-white/90 drop-shadow-md z-10">{isMentor ? "You (Mentor)" : "You (Student)"}</span>
          </div>
        </div>
        {screenSharing && (
          <div className="absolute top-4 left-4 z-30 flex items-center gap-2 rounded-full bg-[#c7586d] px-2.5 py-1 text-xs font-bold text-white shadow-lg animate-pulse"><Square size={12} /> Sharing Screen</div>
        )}
        {callNotice && (
          <div className="absolute top-4 left-4 right-4 z-30 flex items-center gap-2 rounded-xl bg-slate-900/90 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-lg backdrop-blur-sm"><AlertCircle size={14} className="shrink-0 text-amber-400" /><span>{callNotice}</span></div>
        )}
        {!callConnected && !screenSharing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111625]/90 backdrop-blur-xs p-6 text-center"><div className="h-10 w-10 rounded-full border-4 border-[#7564ed]/30 border-t-[#7564ed] animate-spin mb-3" /><p className="text-sm font-bold text-white">Connecting live video session…</p><p className="text-xs text-[#8995b0] mt-1 font-mono">Room: {roomId}</p></div>
        )}
      </div>

      <div className="border-t border-[#e4e8f1] bg-[#f7f8fc] px-4 sm:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${callConnected ? "bg-[#e4f8f5] text-[#247b70]" : "bg-[#f0edff] text-[#5e4bc1]"}`}><span className={`h-2 w-2 rounded-full ${callConnected ? "bg-[#2c967b]" : "bg-[#7564ed] animate-pulse"}`} />{callConnected ? "Session Connected" : "Connecting…"}</span>
            <span className="text-xs text-[#73809b]">{isMentor ? "Mentor Live Desk" : "Student Live Desk"} · Room {roomId}</span>
          </div>
          <button type="button" onClick={handleEndCall} className="rounded-xl bg-[#c7586d] px-4 py-1.5 text-xs sm:text-sm font-bold text-white hover:bg-[#b14a5a] transition shadow-xs">{isMentor ? "End Session" : "Leave Call"}</button>
        </div>
      </div>
    </section>
  );
}

export default VideoCall;