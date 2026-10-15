"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Flag } from "lucide-react";
import { FaceDetector, FaceLandmarker, FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision";
import { MARKS, SUBJECTS, clock, trackTime } from "@/lib/contest";
import ExamDeviceNotice from "@/components/ExamDeviceNotice";
import { isPhoneDevice } from "@/lib/exam-device";

const btn = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40";
export const primary = `${btn} bg-[#7564ed] text-white shadow-[0_8px_20px_rgba(117,100,237,.2)] hover:bg-[#6655df]`;
export const ghost = `${btn} border border-[#dfe3ef] bg-white text-[#34405b] hover:bg-[#f3f1ff]`;
export const soft = `${btn} bg-[#f0edff] text-[#5e4bc1] hover:bg-[#e5e0ff]`;
const ELECTRONIC_DEVICE_LABELS = new Set(["cell phone", "laptop", "laptop computer", "tablet", "keyboard", "mouse", "remote", "tv", "monitor"]);
const CAMERA_CONFIRMATION_FRAMES = 3;

export function Card({ children, className = "" }) {
  return <section className={`rounded-2xl border border-[#e4e8f1] bg-white p-5 ${className}`}>{children}</section>;
}

// Timed question room with subject tabs, question palette, mark for review and confirm-to-submit.
export default function TestRoom({ eyebrow, title, noun = "test", questions, session, now, onUpdate, onSubmit, onExit }) {
  const [confirming, setConfirming] = useState(false);
  const [warningNumber, setWarningNumber] = useState(null);
  const [exitRequested, setExitRequested] = useState(false);
  const [secureMode, setSecureMode] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraWarningNumber, setCameraWarningNumber] = useState(null);
  const [cameraRequested, setCameraRequested] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [faceBox, setFaceBox] = useState(null);
  const [deviceDetected, setDeviceDetected] = useState(false);
  const [personDetected, setPersonDetected] = useState(false);
  const [cameraAlert, setCameraAlert] = useState("");
  const [cameraPosition, setCameraPosition] = useState({ top: 20, right: 20 });
  const [deviceBlocked, setDeviceBlocked] = useState(false);
  const warningCount = useRef(0);
  const cameraWarningCount = useRef(0);
  const viewportRef = useRef(null);
  const secureModeRef = useRef(false);
  const lastViolationAt = useRef(0);
  const lastCameraViolationAt = useRef(0);
  const cameraIssueRef = useRef(false);
  const cameraIssueTypeRef = useRef("");
  const cameraIssueStreakRef = useRef(0);
  const deviceDetectedRef = useRef(false);
  const neutralPoseRef = useRef(null);
  const cameraReadyRef = useRef(false);
  const roomRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const objectDetectorRef = useRef(null);
  const dragRef = useRef(null);
  const lastVisionTimestampRef = useRef(0);
  const visionBusyRef = useRef(false);
  const q = questions[session.current];
  const remaining = session.endsAt - now;
  const picked = session.answers[session.current];
  const answeredCount = Object.keys(session.answers).length;
  const go = (index) => onUpdate({ ...trackTime(session), current: Math.min(questions.length - 1, Math.max(0, index)) });
  const choose = (option) => onUpdate({ ...session, answers: { ...session.answers, [session.current]: option } });
  const clear = () => { const answers = { ...session.answers }; delete answers[session.current]; onUpdate({ ...session, answers }); };
  const toggleMark = () => onUpdate({ ...session, marked: session.marked.includes(session.current) ? session.marked.filter((i) => i !== session.current) : [...session.marked, session.current] });
  const status = (index) => index === session.current ? "border-[#7564ed] bg-[#f0edff] text-[#5e4bc1] ring-2 ring-[#cfc7fb]" : session.marked.includes(index) ? "border-[#f0d9a6] bg-[#fff3dc] text-[#b67821]" : session.answers[index] !== undefined ? "border-[#9ad7c9] bg-[#ddf6ed] text-[#2c967b]" : "border-[#e4e8f1] bg-[#fafbfe] text-[#73809b]";
  useEffect(() => {
    if (isPhoneDevice()) setDeviceBlocked(true);
  }, []);
  const showCameraWarning = (type, force = false) => {
    if (!secureModeRef.current || (!force && Date.now() - lastCameraViolationAt.current < 5000)) return;
    lastCameraViolationAt.current = Date.now();
    const next = cameraWarningCount.current + 1;
    cameraWarningCount.current = next;
    cameraIssueTypeRef.current = type;
    setCameraAlert(type);
    setCameraWarningNumber(next);
  };

  useEffect(() => {
    const showWarning = () => {
      if (!secureModeRef.current || !cameraReadyRef.current || Date.now() - lastViolationAt.current < 500) return;
      lastViolationAt.current = Date.now();
      const next = warningCount.current + 1;
      warningCount.current = next;
      setWarningNumber(next);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      showWarning();
    };
    const handleViewportResize = () => {
      const visualViewport = window.visualViewport;
      const nextViewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        visualWidth: visualViewport ? visualViewport.width : null,
        visualHeight: visualViewport ? visualViewport.height : null,
      };
      const previousViewport = viewportRef.current;
      viewportRef.current = nextViewport;
      if (!previousViewport) return;
      const changed = Object.keys(nextViewport).some((key) => nextViewport[key] !== previousViewport[key]);
      if (changed) showWarning();
    };
    const handleFullscreenChange = () => {
      const inFullscreen = document.fullscreenElement === roomRef.current;
      if (inFullscreen) {
        secureModeRef.current = false;
        setSecureMode(true);
        setCameraRequested(true);
        setFullscreenError("");
        return;
      }
      if (secureModeRef.current) showWarning();
      secureModeRef.current = false;
      setSecureMode(false);
    };
    const visualViewport = window.visualViewport;
    viewportRef.current = {
      width: window.innerWidth,
      height: window.innerHeight,
      visualWidth: visualViewport ? visualViewport.width : null,
      visualHeight: visualViewport ? visualViewport.height : null,
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("resize", handleViewportResize);
    visualViewport?.addEventListener("resize", handleViewportResize);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("resize", handleViewportResize);
      visualViewport?.removeEventListener("resize", handleViewportResize);
    };
  }, []);

  useEffect(() => {
    if (!secureMode || !cameraRequested) return undefined;
    let cancelled = false;
    let interval;

    const startCameraCheck = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is unavailable. Use a secure connection and allow camera access in your browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm");
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
          runningMode: "VIDEO",
          numFaces: 2,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
        });
        faceDetectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite" },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.35,
        });
        objectDetectorRef.current = await ObjectDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite" },
          runningMode: "VIDEO",
          scoreThreshold: 0.45,
        });
        cameraReadyRef.current = true;
        secureModeRef.current = true;
        setCameraReady(true);
        interval = window.setInterval(async () => {
          if (visionBusyRef.current || !videoRef.current || videoRef.current.readyState < 2 || !faceLandmarkerRef.current || !faceDetectorRef.current || !objectDetectorRef.current) return;
          visionBusyRef.current = true;
          try {
            const timestamp = Math.max(performance.now(), lastVisionTimestampRef.current + 1);
            lastVisionTimestampRef.current = timestamp;
            const video = videoRef.current;
            const faceLandmarker = faceLandmarkerRef.current;
            const faceDetector = faceDetectorRef.current;
            const objectDetector = objectDetectorRef.current;
            const faces = faceLandmarker.detectForVideo(video, timestamp).faceLandmarks;
            const faceDetections = faceDetector.detectForVideo(video, timestamp).detections;
            const multipleFaces = faceDetections.length > 1;
            setPersonDetected(multipleFaces);
            const face = faces[0];
            let headTurned = false;
            if (!face) {
              setFaceBox(null);
            } else {
              const xs = face.map((point) => point.x);
              const ys = face.map((point) => point.y);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);
              const leftEye = face[33];
              const rightEye = face[263];
              const nose = face[1];
              const eyeMidX = (leftEye.x + rightEye.x) / 2;
              const eyeDistance = Math.max(0.001, Math.abs(rightEye.x - leftEye.x));
              const yaw = Math.abs((nose.x - eyeMidX) / eyeDistance);
              const eyeMidY = (leftEye.y + rightEye.y) / 2;
              const mouth = face[13];
              const pitch = Math.abs((nose.y - eyeMidY) / Math.max(0.001, Math.abs(mouth.y - eyeMidY)));
              const pose = { yaw, pitch };
              if (!neutralPoseRef.current) neutralPoseRef.current = pose;
              headTurned = Math.abs(yaw - neutralPoseRef.current.yaw) > 0.35 || Math.abs(pitch - neutralPoseRef.current.pitch) > 0.35;
              setFaceBox({ left: `${(1 - maxX) * 100}%`, top: `${minY * 100}%`, width: `${(maxX - minX) * 100}%`, height: `${(maxY - minY) * 100}%`, turned: headTurned });
            }
            const detections = objectDetector.detectForVideo(video, timestamp).detections;
            const device = detections.some((detection) => {
              const label = detection.categories[0]?.categoryName?.toLowerCase();
              return label && [...ELECTRONIC_DEVICE_LABELS].some((deviceLabel) => label.includes(deviceLabel));
            });
            setDeviceDetected(device);
            if (device && !deviceDetectedRef.current) showCameraWarning("device", true);
            deviceDetectedRef.current = device;
            const issueType = multipleFaces ? "person" : "";
            if (issueType === cameraIssueTypeRef.current) cameraIssueStreakRef.current += 1;
            else {
              cameraIssueTypeRef.current = issueType;
              cameraIssueStreakRef.current = issueType ? 1 : 0;
            }
            if (issueType && cameraIssueStreakRef.current >= CAMERA_CONFIRMATION_FRAMES && !cameraIssueRef.current) {
              showCameraWarning(issueType);
              cameraIssueRef.current = true;
            }
            if (!issueType) {
              cameraIssueRef.current = false;
              cameraIssueTypeRef.current = "";
              cameraIssueStreakRef.current = 0;
            }
          } catch {
            setCameraError("The camera verification stopped working. The exam cannot continue without it.");
          } finally {
            visionBusyRef.current = false;
          }
        }, 1000);
      } catch {
        setCameraError("Camera permission was granted, but the face and device models could not be loaded. Check your internet connection and retry.");
      }
    };
    startCameraCheck();
    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      faceLandmarkerRef.current?.close();
      faceDetectorRef.current?.close();
      objectDetectorRef.current?.close();
      faceLandmarkerRef.current = null;
      faceDetectorRef.current = null;
      objectDetectorRef.current = null;
      visionBusyRef.current = false;
      lastVisionTimestampRef.current = 0;
      cameraReadyRef.current = false;
      secureModeRef.current = false;
      setFaceBox(null);
      setDeviceDetected(false);
      setPersonDetected(false);
      setCameraAlert("");
      neutralPoseRef.current = null;
      cameraIssueRef.current = false;
      cameraIssueTypeRef.current = "";
      cameraIssueStreakRef.current = 0;
      deviceDetectedRef.current = false;
      setCameraReady(false);
    };
  }, [cameraAttempt, cameraRequested, secureMode]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const enterSecureMode = async () => {
    setFullscreenError("");
    if (!document.fullscreenEnabled || !roomRef.current?.requestFullscreen) {
      setFullscreenError("Secure fullscreen mode is not supported by this browser. Please use the latest Chrome, Edge, or Firefox.");
      return;
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("camera-unavailable");
      const permissionStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      permissionStream.getTracks().forEach((track) => track.stop());
      setCameraRequested(true);
      await roomRef.current.requestFullscreen();
    } catch {
      setFullscreenError("Camera permission is required before the secure exam can begin. Allow camera access and try again.");
    }
  };

  const startDraggingCamera = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, top: cameraPosition.top, right: cameraPosition.right };
    const move = (moveEvent) => {
      if (!dragRef.current) return;
      setCameraPosition({
        top: Math.max(8, dragRef.current.top + moveEvent.clientY - dragRef.current.y),
        right: Math.max(8, dragRef.current.right - (moveEvent.clientX - dragRef.current.x)),
      });
    };
    const stop = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const cameraBlocked = secureMode && (!cameraReady || cameraError);

  if (deviceBlocked) return <ExamDeviceNotice onBack={onExit} />;

  return <div ref={roomRef} className="fixed inset-0 z-50 overflow-y-auto bg-[#f7f8fc] p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-7xl space-y-5">
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e4e8f1] bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-bold text-[#59647d]">Exam mode is active. Use the Exit exam button to leave the dashboard.</p>
      <button onClick={() => setExitRequested(true)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#6958d2] hover:bg-[#f0edff]">Exit exam</button>
    </div>
    <div className="space-y-5">
    {secureMode && <div style={{ top: cameraPosition.top, right: cameraPosition.right }} className={`fixed z-[5] w-52 overflow-hidden rounded-xl border-2 ${faceBox?.turned || deviceDetected ? "border-[#bd4a5a]" : "border-[#2c967b]"} bg-[#18223c] shadow-xl`}>
      <div onPointerDown={startDraggingCamera} className="cursor-move bg-[#18223c] px-2 py-1 text-center text-[10px] font-extrabold text-white">Drag camera</div>
      <div className="relative aspect-video">
        <video ref={videoRef} muted playsInline className={`${cameraReady ? "block" : "hidden"} h-full w-full scale-x-[-1] object-cover`} />
        {faceBox && <div className={`absolute border-4 ${faceBox.turned ? "border-[#bd4a5a]" : "border-[#2c967b]"}`} style={{ left: faceBox.left, top: faceBox.top, width: faceBox.width, height: faceBox.height }} />}
      </div>
      <p className={`px-2 py-1 text-center text-[10px] font-extrabold ${deviceDetected || personDetected ? "bg-[#fff1f1] text-[#bd4a5a]" : faceBox?.turned ? "bg-[#fff3dc] text-[#b67821]" : "bg-[#ddf6ed] text-[#2c967b]"}`}>{deviceDetected ? "Electronic device detected" : personDetected ? "Another person detected" : faceBox?.turned ? "Please face forward" : "Camera active"}</p>
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">{eyebrow}</p><h1 className="text-2xl font-extrabold text-[#18223c]">{title}</h1></div>
      <span className={`rounded-xl px-4 py-2 text-sm font-extrabold tabular-nums ${remaining < 300000 ? "bg-[#fff1f1] text-[#bd4a5a]" : "bg-[#fff2e4] text-[#c17a27]"}`}><Clock3 size={16} className="mr-2 inline" />{clock(remaining)}</span>
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
      <Card>
        <div className="flex flex-wrap gap-2">{SUBJECTS.map((subject) => { const first = questions.findIndex((item) => item.subject === subject); return <button key={subject} onClick={() => go(first)} className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${q.subject === subject ? "bg-[#7564ed] text-white" : "bg-[#f0edff] text-[#8d83c9]"}`}>{subject}</button>; })}</div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-extrabold text-[#7564ed]">Q{session.current + 1} of {questions.length} · {q.chapter}</span><span className="text-[#8994aa]">+{MARKS.correct} correct · {MARKS.wrong} wrong</span></div>
        <h2 className="mt-3 text-xl font-extrabold leading-8 text-[#25304b]">{q.text}</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">{q.options.map((option, index) => <button key={option} onClick={() => choose(index)} className={`min-h-14 rounded-xl border p-4 text-left text-sm font-semibold leading-6 transition ${picked === index ? "border-[#8273df] bg-[#f1efff]" : "border-[#e4e8f1] bg-[#fafbfe] hover:border-[#bcb2f0]"}`}>{String.fromCharCode(65 + index)}. {option}</button>)}</div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f5] pt-5">
          <div className="flex flex-wrap gap-2"><button onClick={toggleMark} className={ghost}><Flag size={15} />{session.marked.includes(session.current) ? "Unmark" : "Mark for review"}</button><button onClick={clear} disabled={picked === undefined} className={ghost}>Clear</button></div>
          <div className="flex gap-2"><button onClick={() => go(session.current - 1)} disabled={session.current === 0} className={ghost}><ChevronLeft size={16} />Previous</button><button onClick={() => go(session.current + 1)} disabled={session.current === questions.length - 1} className={primary}>Next<ChevronRight size={16} /></button></div>
        </div>
      </Card>
      <Card className="h-fit">
        <p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">QUESTION PALETTE</p>
        <div className="mt-4 grid grid-cols-5 gap-2">{questions.map((_, index) => <button key={index} onClick={() => go(index)} aria-label={`Question ${index + 1}`} className={`grid h-10 place-items-center rounded-lg border text-xs font-extrabold ${status(index)}`}>{index + 1}</button>)}</div>
        <div className="mt-4 space-y-1.5 text-[11px] text-[#73809b]"><p><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[#9ad7c9]" />Answered ({answeredCount})</p><p><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[#f0d9a6]" />Marked for review ({session.marked.length})</p><p><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-[#e4e8f1]" />Not answered ({questions.length - answeredCount})</p></div>
        {confirming ? <div className="mt-5 rounded-xl border border-[#efc3c3] bg-[#fff8f8] p-3"><p className="text-xs font-bold text-[#59647d]">Submit now? {questions.length - answeredCount} unanswered{session.marked.length ? `, ${session.marked.length} marked for review` : ""}.</p><div className="mt-3 flex gap-2"><button onClick={() => onSubmit(session)} className={`${primary} flex-1`}>Submit</button><button onClick={() => setConfirming(false)} className={`${ghost} flex-1`}>Cancel</button></div></div> : <button onClick={() => setConfirming(true)} className={`${primary} mt-5 w-full`}>Submit {noun}</button>}
      </Card>
    </div>
    </div>
    </div>
    {!secureMode && warningNumber === null && !exitRequested && <div className="fixed inset-0 z-20 grid place-items-center bg-[#18223c]/60 p-6" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="secure-mode-title" className="w-full max-w-md rounded-2xl border border-[#e4e8f1] bg-white p-7 text-center shadow-2xl">
        <p className="text-[10px] font-extrabold tracking-[.18em] text-[#7564ed]">SECURE EXAM MODE</p>
        <h2 id="secure-mode-title" className="mt-2 text-xl font-extrabold text-[#18223c]">Allow camera to begin</h2>
        <p className="mt-3 text-sm leading-6 text-[#59647d]">First allow camera access. After permission is granted, the exam will enter fullscreen mode and security monitoring will begin.</p>
        {fullscreenError && <p role="alert" className="mt-4 rounded-xl bg-[#fff1f1] p-3 text-xs font-bold leading-5 text-[#bd4a5a]">{fullscreenError}</p>}
        <button autoFocus onClick={enterSecureMode} className={`${primary} mt-6 w-full`}>Allow camera and begin exam</button>
      </div>
    </div>}
    {cameraBlocked && warningNumber === null && cameraWarningNumber === null && !exitRequested && <div className="fixed inset-0 z-20 grid place-items-center bg-[#18223c]/60 p-6" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="camera-title" className="w-full max-w-md rounded-2xl border border-[#e4e8f1] bg-white p-7 text-center shadow-2xl">
        <p className="text-[10px] font-extrabold tracking-[.18em] text-[#7564ed]">CAMERA CHECK REQUIRED</p>
        <h2 id="camera-title" className="mt-2 text-xl font-extrabold text-[#18223c]">Enable camera verification</h2>
        <p className="mt-3 text-sm leading-6 text-[#59647d]">Keep your face visible and alone in the camera frame. The camera stays local to this browser; no video is uploaded.</p>
        {cameraError && <p role="alert" className="mt-4 rounded-xl bg-[#fff1f1] p-3 text-xs font-bold leading-5 text-[#bd4a5a]">{cameraError}</p>}
        {!cameraRequested && <p className="mt-4 text-xs font-bold text-[#7564ed]">Camera permission is required before the exam can begin.</p>}
        {cameraRequested && !cameraError && <p className="mt-4 text-xs font-bold text-[#7564ed]">Starting the camera and face check...</p>}
        {cameraError && <button onClick={() => { setCameraError(""); setCameraRequested(true); setCameraAttempt((attempt) => attempt + 1); }} className={`${primary} mt-6 w-full`}>Retry camera check</button>}
      </div>
    </div>}
    {(warningNumber !== null || cameraWarningNumber !== null || exitRequested) && <div className="fixed inset-0 z-30 grid place-items-center bg-[#18223c]/45 p-6" role="presentation">
      <div role="alertdialog" aria-modal="true" aria-labelledby="tab-warning-title" className="w-full max-w-md rounded-2xl border border-[#e4e8f1] bg-white p-7 text-center shadow-2xl">
        <p className="text-[10px] font-extrabold tracking-[.18em] text-[#bd4a5a]">{exitRequested ? "LEAVING EXAM" : cameraWarningNumber !== null ? "CAMERA SECURITY ALERT" : "EXAM SECURITY ALERT"}</p>
        <h2 id="tab-warning-title" className="mt-2 text-xl font-extrabold text-[#18223c]">
          {exitRequested ? "Leave this exam?" : cameraWarningNumber >= 3 ? "Your exam has been submitted" : warningNumber >= 3 ? "Your exam has been submitted" : cameraAlert === "person" ? "Another person detected" : cameraAlert === "head" ? "Head movement detected" : cameraWarningNumber !== null ? "Electronic device detected" : "Tab switching detected"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#59647d]">
          {exitRequested
            ? "If you leave the exam, your current attempt will be submitted automatically."
            : cameraWarningNumber >= 3
            ? `${cameraAlert === "person" ? "Another person" : cameraAlert === "head" ? "Excessive head movement" : "An electronic device"} was detected 3 times, so this attempt has been submitted.`
            : warningNumber >= 3
            ? "You switched away from or resized the exam window 3 times, so this attempt has been submitted."
            : cameraWarningNumber !== null
            ? `${cameraAlert === "person" ? "Another person was detected" : cameraAlert === "head" ? "Please face forward" : "An electronic device was detected"}. This is camera warning ${cameraWarningNumber} of 3.`
            : `You switched away from or resized the exam window. This is warning ${warningNumber} of 3. Please stay on this page while writing the exam.`}
        </p>
        {exitRequested ? <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button autoFocus onClick={() => setExitRequested(false)} className={ghost}>Continue exam</button>
          <button onClick={() => { onSubmit(session); onExit(); }} className={primary}>Exit and submit</button>
        </div> : <button
          autoFocus
          onClick={() => {
            if (warningNumber >= 3 || cameraWarningNumber >= 3) {
              onSubmit(session);
              onExit();
            } else {
              setWarningNumber(null);
              setCameraWarningNumber(null);
              setCameraAlert("");
              cameraIssueRef.current = false;
              cameraIssueTypeRef.current = "";
              cameraIssueStreakRef.current = 0;
            }
          }}
          className={`${primary} mt-6 w-full`}
        >
          {warningNumber >= 3 || cameraWarningNumber >= 3 ? "OK, return to dashboard" : "OK, continue exam"}
        </button>}
      </div>
    </div>}
  </div>;
}
