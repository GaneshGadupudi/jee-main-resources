"use client";

import { useEffect, useState, useRef } from "react";
import {
  PenTool,
  Camera,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Eye,
  X,
  RefreshCw,
  User,
  Image as ImageIcon,
  Check,
  ChevronRight,
  Sparkles,
  RotateCcw,
} from "lucide-react";

export default function MentorWrittenSolutions() {
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "assigned" | "completed"
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({ pending: [], assigned: [], completed: [] });
  const [message, setMessage] = useState(null); // { text, type: 'success' | 'error' | 'info' }

  // Action states
  const [actionBusy, setActionBusy] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState({}); // { [requestId]: File }
  const [photoPreviews, setPhotoPreviews] = useState({}); // { [requestId]: string (objectUrl) }
  const [notes, setNotes] = useState({}); // { [requestId]: string }
  const [viewingImage, setViewingImage] = useState(null); // { url, title }

  // Separate refs for Camera Capture and File Upload
  const cameraInputRefs = useRef({});
  const fileInputRefs = useRef({});

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/mentor/written-solutions");
      if (res.ok) {
        const json = await res.json();
        setData({
          pending: json.pending || [],
          assigned: json.assigned || [],
          completed: json.completed || [],
        });
        if (isManual) {
          setMessage({ text: "Written solutions queue refreshed.", type: "info" });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ text: err.error || "Failed to load written solutions.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error loading written solutions.", type: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 20000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (requestId) => {
    setActionBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/mentor/written-solutions/${requestId}/accept`, {
        method: "PATCH",
      });
      const result = await res.json();
      if (res.ok) {
        setMessage({
          text: "Request accepted! You can now take a photo or upload your handwritten solution below.",
          type: "success",
        });
        await loadData();
        setActiveTab("assigned");
      } else {
        setMessage({ text: result.error || "Unable to accept request.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error accepting request.", type: "error" });
    } finally {
      setActionBusy(false);
    }
  };

  const handlePhotoSelect = (requestId, file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ text: "Please select an image file (JPG, PNG, or WEBP).", type: "error" });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setMessage({ text: "File size exceeds 15MB limit.", type: "error" });
      return;
    }

    // Clean up previous preview url if any
    if (photoPreviews[requestId]) {
      URL.revokeObjectURL(photoPreviews[requestId]);
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedPhoto((prev) => ({ ...prev, [requestId]: file }));
    setPhotoPreviews((prev) => ({ ...prev, [requestId]: previewUrl }));
  };

  const handleClearPhoto = (requestId) => {
    if (photoPreviews[requestId]) {
      URL.revokeObjectURL(photoPreviews[requestId]);
    }
    setSelectedPhoto((prev) => {
      const next = { ...prev };
      delete next[requestId];
      return next;
    });
    setPhotoPreviews((prev) => {
      const next = { ...prev };
      delete next[requestId];
      return next;
    });
    if (cameraInputRefs.current[requestId]) {
      cameraInputRefs.current[requestId].value = "";
    }
    if (fileInputRefs.current[requestId]) {
      fileInputRefs.current[requestId].value = "";
    }
  };

  const handleSendSolution = async (requestId) => {
    const photo = selectedPhoto[requestId];
    if (!photo) {
      setMessage({
        text: "Please capture or upload a photo of your handwritten solution before sending.",
        type: "error",
      });
      return;
    }

    setActionBusy(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("photo", photo);
      if (notes[requestId]) {
        formData.append("notes", notes[requestId]);
      }

      const res = await fetch(`/api/mentor/written-solutions/${requestId}/solve`, {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (res.ok) {
        setMessage({
          text: "Handwritten solution sent to the student! It is now accessible in their Mentor Solutions section for 30 days.",
          type: "success",
        });

        // Clean up local file state
        handleClearPhoto(requestId);
        setNotes((prev) => {
          const next = { ...prev };
          delete next[requestId];
          return next;
        });

        await loadData();
        setActiveTab("completed");
      } else {
        setMessage({ text: result.error || "Failed to submit solution.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error sending solution.", type: "error" });
    } finally {
      setActionBusy(false);
    }
  };

  const getSubjectBadge = (subject) => {
    const s = (subject || "").toLowerCase();
    if (s.includes("phys")) return "bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]";
    if (s.includes("chem")) return "bg-[#fef3c7] text-[#92400e] border-[#fde68a]";
    return "bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]";
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Action banner / notifications */}
      {message && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-2xl border p-3.5 sm:p-4 text-xs sm:text-sm font-semibold transition ${
            message.type === "success"
              ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
              : message.type === "error"
              ? "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
              : "border-[#bfdbfe] bg-[#eff6ff] text-[#1e40af]"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {message.type === "success" ? (
              <CheckCircle2 size={18} className="shrink-0 text-[#16a34a]" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-[#dc2626]" />
            )}
            <span className="break-words">{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="p-1 text-current opacity-70 hover:opacity-100"
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Controls & Horizontally Scrollable Tab Bar (Mobile Optimized) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e9f2] pb-3">
        {/* Scrollable Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`shrink-0 relative inline-flex items-center gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-extrabold transition ${
              activeTab === "pending"
                ? "bg-[#7564ed] text-white shadow-xs"
                : "bg-white text-[#46516c] hover:bg-[#f7f8fc] border border-[#e4e8f1]"
            }`}
          >
            <span>Student Requests</span>
            {data.pending.length > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold ${
                  activeTab === "pending"
                    ? "bg-white text-[#7564ed]"
                    : "bg-[#fee2e2] text-[#dc2626]"
                }`}
              >
                {data.pending.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("assigned")}
            className={`shrink-0 relative inline-flex items-center gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-extrabold transition ${
              activeTab === "assigned"
                ? "bg-[#7564ed] text-white shadow-xs"
                : "bg-white text-[#46516c] hover:bg-[#f7f8fc] border border-[#e4e8f1]"
            }`}
          >
            <span>My In-Progress</span>
            {data.assigned.length > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold ${
                  activeTab === "assigned"
                    ? "bg-white text-[#7564ed]"
                    : "bg-[#fef3c7] text-[#92400e]"
                }`}
              >
                {data.assigned.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`shrink-0 relative inline-flex items-center gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-extrabold transition ${
              activeTab === "completed"
                ? "bg-[#7564ed] text-white shadow-xs"
                : "bg-white text-[#46516c] hover:bg-[#f7f8fc] border border-[#e4e8f1]"
            }`}
          >
            <span>Sent Solutions</span>
            {data.completed.length > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold ${
                  activeTab === "completed"
                    ? "bg-white text-[#7564ed]"
                    : "bg-[#e4f8f5] text-[#247b70]"
                }`}
              >
                {data.completed.length}
              </span>
            )}
          </button>
        </div>

        {/* Refresh button */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#dfe5ef] bg-white px-3.5 py-2 text-xs font-bold text-[#46516c] hover:bg-[#f7f8fc] transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-16 sm:py-20 text-center text-xs sm:text-sm font-semibold text-[#8a95ab]">
          <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-[#7564ed]" />
          Loading written solutions queue...
        </div>
      ) : activeTab === "pending" ? (
        /* TAB 1: Student Requests (Pending) */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-sm sm:text-base font-extrabold text-[#18223c]">
              Pending Student Requests ({data.pending.length})
            </h2>
            <span className="text-xs text-[#73809b]">
              Accept a request to write and upload the handwritten solution
            </span>
          </div>

          {data.pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d2d9e6] bg-white p-8 sm:p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0edff] text-[#7564ed]">
                <PenTool size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-[#18223c]">No pending requests</h3>
              <p className="mt-1 text-xs text-[#73809b]">
                All student written solution requests have been accepted or answered.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.pending.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#e4e8f1] bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-sm hover:border-[#cfd7e6]"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${getSubjectBadge(
                            req.subject
                          )}`}
                        >
                          {req.subject}
                        </span>
                        {req.chapter && (
                          <span className="text-[11px] font-semibold text-[#73809b]">
                            • {req.chapter}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#8a95ab] shrink-0">
                        {new Date(req.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>

                    <div>
                      <p className="line-clamp-4 text-xs sm:text-sm font-semibold text-[#18223c] leading-relaxed">
                        {req.questionText}
                      </p>
                    </div>

                    {req.hasQuestionImage && (
                      <button
                        type="button"
                        onClick={() =>
                          setViewingImage({
                            url: req.questionImageUrl,
                            title: `Question Photo - ${req.subject}`,
                          })
                        }
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#dfe5ef] bg-[#f8fafc] px-2.5 py-1.5 text-xs font-semibold text-[#46516c] hover:bg-[#f1f5f9] transition"
                      >
                        <ImageIcon size={14} className="text-[#6366f1]" />
                        <span>View Attached Question Photo</span>
                      </button>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-[#f1f4f9] text-xs text-[#73809b]">
                      <User size={13} className="text-[#94a3b8] shrink-0" />
                      <span className="font-medium truncate">{req.student?.name || "Student"}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#f1f4f9]">
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => handleAccept(req.id)}
                      className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#7564ed] px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition hover:bg-[#6655df] disabled:opacity-60 shadow-xs active:scale-[0.99]"
                    >
                      <Check size={15} />
                      <span>Accept Request</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "assigned" ? (
        /* TAB 2: My In-Progress (Assigned) */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-sm sm:text-base font-extrabold text-[#18223c]">
              My In-Progress Requests ({data.assigned.length})
            </h2>
            <span className="text-xs text-[#73809b]">
              Take a photo or upload your handwritten solution and send to student
            </span>
          </div>

          {data.assigned.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d2d9e6] bg-white p-8 sm:p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0edff] text-[#7564ed]">
                <Clock size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-[#18223c]">No assigned tasks</h3>
              <p className="mt-1 text-xs text-[#73809b]">
                You have no questions currently in progress. Go to &ldquo;Student Requests&rdquo; to accept a question.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {data.assigned.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-[#d6dbe7] bg-white p-4 sm:p-6 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-[#f1f4f9] pb-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span
                            className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${getSubjectBadge(
                              req.subject
                            )}`}
                          >
                            {req.subject}
                          </span>
                          {req.chapter && (
                            <span className="text-xs font-semibold text-[#73809b] truncate">
                              {req.chapter}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#8a95ab]">
                          Asked by <strong className="text-[#334155]">{req.student?.name}</strong> • Req ID: {req.requestId}
                        </p>
                      </div>

                      <span className="rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[10px] font-extrabold text-[#92400e] shrink-0">
                        IN PROGRESS
                      </span>
                    </div>

                    {/* Original Question Box */}
                    <div className="rounded-xl bg-[#f8fafc] p-3.5 sm:p-4 border border-[#e9eef5]">
                      <p className="text-xs font-bold text-[#64748b] mb-1">Original Question:</p>
                      <p className="text-xs sm:text-sm font-semibold text-[#1e293b] leading-relaxed whitespace-pre-wrap">
                        {req.questionText}
                      </p>
                      {req.hasQuestionImage && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() =>
                              setViewingImage({
                                url: req.questionImageUrl,
                                title: `Question Photo - ${req.subject}`,
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#475569] hover:bg-[#f1f5f9] transition"
                          >
                            <Eye size={14} className="text-[#6366f1]" />
                            <span>View Student&apos;s Attached Question Photo</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Hidden Inputs for Camera and File Upload */}
                    <input
                      ref={(el) => (cameraInputRefs.current[req.id] = el)}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handlePhotoSelect(req.id, e.target.files?.[0])}
                    />
                    <input
                      ref={(el) => (fileInputRefs.current[req.id] = el)}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoSelect(req.id, e.target.files?.[0])}
                    />

                    {/* Dual Action Options: Take Photo vs Upload Photo */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-extrabold text-[#334155]">
                          Handwritten Solution Photo <span className="text-[#ef4444]">*</span>
                        </label>
                        <span className="text-[11px] text-[#64748b]">JPG, PNG, WEBP (Max 15MB)</span>
                      </div>

                      {photoPreviews[req.id] ? (
                        /* Preview of Selected/Captured Image */
                        <div className="relative rounded-2xl border border-[#cbd5e1] bg-[#f8fafc] p-3.5 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={photoPreviews[req.id]}
                                alt="Handwritten solution preview"
                                className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl object-cover border border-[#e2e8f0] shadow-2xs"
                              />
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-[#1e293b] truncate">
                                  {selectedPhoto[req.id]?.name}
                                </p>
                                <p className="text-[11px] text-[#64748b] mt-0.5">
                                  {(selectedPhoto[req.id]?.size / 1024 / 1024).toFixed(2)} MB •{" "}
                                  <span className="text-[#16a34a] font-bold">Ready to send</span>
                                </p>
                                <div className="mt-2 flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewingImage({
                                        url: photoPreviews[req.id],
                                        title: "Solution Photo Preview",
                                      })
                                    }
                                    className="inline-flex items-center gap-1 text-xs font-bold text-[#6366f1] hover:underline"
                                  >
                                    <Eye size={13} />
                                    <span>Preview Full</span>
                                  </button>
                                  <span className="text-[#cbd5e1]">•</span>
                                  <button
                                    type="button"
                                    onClick={() => cameraInputRefs.current[req.id]?.click()}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-[#475569] hover:underline"
                                  >
                                    <RotateCcw size={12} />
                                    <span>Retake</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleClearPhoto(req.id)}
                              className="self-end sm:self-center inline-flex items-center gap-1 rounded-xl border border-[#fecaca] bg-white px-3 py-1.5 text-xs font-bold text-[#ef4444] hover:bg-[#fef2f2] transition"
                              title="Remove photo"
                            >
                              <X size={14} />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Two Dedicated Options: "Take Photo" & "Upload Photo" */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* Option 1: Take Photo directly via Device Camera */}
                          <button
                            type="button"
                            onClick={() => cameraInputRefs.current[req.id]?.click()}
                            className="group flex items-center gap-3 rounded-2xl border-2 border-dashed border-[#818cf8] bg-[#f5f3ff] p-4 text-left transition hover:border-[#6366f1] hover:bg-[#ede9fe] active:scale-[0.98] shadow-2xs"
                          >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-xs text-[#6366f1] group-hover:scale-105 transition-transform">
                              <Camera size={22} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-extrabold text-[#1e1b4b]">
                                Take Photo
                              </p>
                              <p className="text-[11px] text-[#6366f1] truncate">
                                Open camera directly
                              </p>
                            </div>
                          </button>

                          {/* Option 2: Upload Photo from Device Storage / Gallery */}
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[req.id]?.click()}
                            className="group flex items-center gap-3 rounded-2xl border-2 border-dashed border-[#cbd5e1] bg-[#f8fafc] p-4 text-left transition hover:border-[#94a3b8] hover:bg-[#f1f5f9] active:scale-[0.98] shadow-2xs"
                          >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-xs text-[#475569] group-hover:scale-105 transition-transform">
                              <UploadCloud size={22} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-extrabold text-[#1e293b]">
                                Upload Photo
                              </p>
                              <p className="text-[11px] text-[#64748b] truncate">
                                Choose from device
                              </p>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Mentor Notes */}
                    <div className="space-y-1 pt-1">
                      <label className="block text-xs font-bold text-[#475569]">
                        Short note / tips for student (optional)
                      </label>
                      <textarea
                        rows={2}
                        value={notes[req.id] || ""}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                        }
                        placeholder="e.g. In step 3, apply conservation of energy..."
                        className="w-full rounded-xl border border-[#cbd5e1] p-3 text-xs sm:text-sm text-[#1e293b] focus:border-[#7564ed] focus:outline-none focus:ring-1 focus:ring-[#7564ed]"
                      />
                    </div>
                  </div>

                  {/* Send Button */}
                  <div className="mt-6 pt-4 border-t border-[#f1f4f9]">
                    <button
                      type="button"
                      disabled={actionBusy || !selectedPhoto[req.id]}
                      onClick={() => handleSendSolution(req.id)}
                      className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#2c967b] px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#25826a] disabled:opacity-50 active:scale-[0.99]"
                    >
                      <Send size={16} />
                      <span>{actionBusy ? "Sending Solution..." : "Send to Student"}</span>
                    </button>
                    <p className="mt-2 text-center text-[11px] text-[#8a95ab]">
                      Student will be notified immediately. Solution accessible for 30 days.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* TAB 3: Sent Solutions (Completed) */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-sm sm:text-base font-extrabold text-[#18223c]">
              Sent Solutions ({data.completed.length})
            </h2>
            <span className="text-xs text-[#73809b]">
              Accessible to students for 30 days from sending date
            </span>
          </div>

          {data.completed.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d2d9e6] bg-white p-8 sm:p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e4f8f5] text-[#2c967b]">
                <CheckCircle2 size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-[#18223c]">No sent solutions yet</h3>
              <p className="mt-1 text-xs text-[#73809b]">
                Solutions you send to students will appear here with a 30-day countdown timer.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.completed.map((sol) => (
                <div
                  key={sol.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#e4e8f1] bg-white p-4 sm:p-5 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${getSubjectBadge(
                          sol.subject
                        )}`}
                      >
                        {sol.subject}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-extrabold text-[#92400e] shrink-0">
                        <Clock size={11} />
                        {sol.daysRemaining !== null ? `${sol.daysRemaining} days left` : "30 days"}
                      </span>
                    </div>

                    <p className="line-clamp-3 text-xs sm:text-sm font-semibold text-[#18223c]">
                      {sol.questionText}
                    </p>

                    {sol.hasSolution && (
                      <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2 sm:p-2.5 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setViewingImage({
                              url: sol.solutionImageUrl,
                              title: `Handwritten Solution - ${sol.subject}`,
                            })
                          }
                          className="inline-flex items-center gap-2 text-xs font-bold text-[#6366f1] hover:underline"
                        >
                          <Eye size={14} />
                          <span>View Solution Photo</span>
                        </button>
                        <span className="text-[10px] font-extrabold text-[#2c967b] bg-[#e4f8f5] px-2 py-0.5 rounded-full">
                          Sent
                        </span>
                      </div>
                    )}

                    {sol.mentorNotes && (
                      <p className="text-xs text-[#64748b] bg-[#fafbfc] p-2.5 rounded-lg border border-[#f1f5f9] italic">
                        &ldquo;{sol.mentorNotes}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-[#f1f4f9] text-[11px] text-[#8a95ab]">
                      <span className="truncate max-w-[60%]">Student: {sol.student?.name}</span>
                      <span>
                        {new Date(sol.solvedAt || sol.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Photo Viewer Modal (Fully Mobile Responsive) */}
      {viewingImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-xs"
        >
          <div className="relative max-h-[92vh] max-w-4xl w-full rounded-2xl bg-white p-3 sm:p-5 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <h3 className="text-xs sm:text-sm font-bold text-[#1e293b] truncate pr-2">
                {viewingImage.title}
              </h3>
              <button
                type="button"
                onClick={() => setViewingImage(null)}
                className="rounded-xl p-1.5 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-3 flex-1 overflow-auto flex items-center justify-center bg-[#0f172a] rounded-xl p-2 min-h-[260px] sm:min-h-[360px]">
              <img
                src={viewingImage.url}
                alt={viewingImage.title}
                className="max-h-[70vh] sm:max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
