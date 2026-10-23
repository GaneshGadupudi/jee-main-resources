"use client";

import { useEffect, useState, useRef } from "react";
import {
  PenTool,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  X,
  RefreshCw,
  User,
  Image as ImageIcon,
  Plus,
  Send,
  Calendar,
  Sparkles,
  ChevronRight,
  BookOpen,
} from "lucide-react";

export default function StudentWrittenSolutions({ onRequestOpen = null, onUpdated = null }) {
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("completed"); // "completed" | "pending"
  const [message, setMessage] = useState(null);

  // Modal for new request
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formSubject, setFormSubject] = useState("Physics");
  const [formChapter, setFormChapter] = useState("");
  const [formQuestion, setFormQuestion] = useState("");
  const [formPhoto, setFormPhoto] = useState(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Image zoom modal
  const [viewingImage, setViewingImage] = useState(null); // { url, title }

  const fileInputRef = useRef(null);

  const loadSolutions = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/me/written-solutions");
      if (res.ok) {
        const data = await res.json();
        setSolutions(data.requests || []);
        if (isManual) {
          setMessage({ text: "Written solutions refreshed.", type: "info" });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ text: err.error || "Unable to load solutions.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error loading solutions.", type: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSolutions();
  }, []);

  const handlePhotoSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ text: "Please upload an image file (JPG, PNG, or WEBP).", type: "error" });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setMessage({ text: "Photo exceeds 15MB size limit.", type: "error" });
      return;
    }

    if (formPhotoPreview) URL.revokeObjectURL(formPhotoPreview);
    setFormPhoto(file);
    setFormPhotoPreview(URL.createObjectURL(file));
  };

  const handleClearFormPhoto = () => {
    if (formPhotoPreview) URL.revokeObjectURL(formPhotoPreview);
    setFormPhoto(null);
    setFormPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!formQuestion.trim()) {
      setMessage({ text: "Please enter your question text.", type: "error" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("subject", formSubject);
      formData.append("chapter", formChapter.trim());
      formData.append("questionText", formQuestion.trim());
      if (formPhoto) {
        formData.append("photo", formPhoto);
      }

      const res = await fetch("/api/me/written-solutions", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (res.ok) {
        setMessage({
          text: "Your question has been sent to mentors! When a mentor uploads their handwritten solution, it will appear here.",
          type: "success",
        });
        setIsModalOpen(false);
        setFormQuestion("");
        setFormChapter("");
        handleClearFormPhoto();
        await loadSolutions();
        if (onUpdated) onUpdated();
        setActiveTab("pending");
      } else {
        setMessage({ text: result.error || "Failed to submit question.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error submitting question.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const completedList = solutions.filter((s) => s.status === "Completed");
  const pendingList = solutions.filter((s) => s.status === "Pending" || s.status === "Assigned");

  const getSubjectBadge = (subject) => {
    const s = (subject || "").toLowerCase();
    if (s.includes("phys")) return "bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]";
    if (s.includes("chem")) return "bg-[#fef3c7] text-[#92400e] border-[#fde68a]";
    return "bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]";
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac] uppercase">
            HANDWRITTEN STEP-BY-STEP GUIDANCE
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18223c]">
            Mentor Solutions
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#73809b]">
            Handwritten solutions prepared by mentors. Each solution remains accessible for 30 days from delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadSolutions(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe5ef] bg-white px-3.5 py-2.5 text-xs font-bold text-[#46516c] hover:bg-[#f7f8fc] transition shadow-xs disabled:opacity-50"
            title="Refresh solutions"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7564ed] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-[#6655df]"
          >
            <Plus size={16} />
            <span>Request Written Solution</span>
          </button>
        </div>
      </div>

      {/* Message alert */}
      {message && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-xs sm:text-sm font-semibold transition ${
            message.type === "success"
              ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
              : message.type === "error"
              ? "border-[#fecaca] bg-[#fef2f2] text-[#991b1b]"
              : "border-[#bfdbfe] bg-[#eff6ff] text-[#1e40af]"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 size={18} className="shrink-0" />
            ) : (
              <AlertCircle size={18} className="shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-current opacity-70 hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e5e9f2] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === "completed"
              ? "bg-[#7564ed] text-white shadow-xs"
              : "bg-white text-[#46516c] hover:bg-[#f7f8fc] border border-[#e4e8f1]"
          }`}
        >
          <span>Completed Solutions</span>
          {completedList.length > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                activeTab === "completed"
                  ? "bg-white text-[#7564ed]"
                  : "bg-[#e4f8f5] text-[#247b70]"
              }`}
            >
              {completedList.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition ${
            activeTab === "pending"
              ? "bg-[#7564ed] text-white shadow-xs"
              : "bg-white text-[#46516c] hover:bg-[#f7f8fc] border border-[#e4e8f1]"
          }`}
        >
          <span>Active Requests</span>
          {pendingList.length > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                activeTab === "pending"
                  ? "bg-white text-[#7564ed]"
                  : "bg-[#fef3c7] text-[#92400e]"
              }`}
            >
              {pendingList.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-sm font-semibold text-[#8a95ab]">
          <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-[#7564ed]" />
          Loading your mentor solutions...
        </div>
      ) : activeTab === "completed" ? (
        /* COMPLETED SOLUTIONS LIST */
        <div className="space-y-4">
          {completedList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d2d9e6] bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0edff] text-[#7564ed]">
                <PenTool size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-[#18223c]">No written solutions yet</h3>
              <p className="mt-1 text-xs text-[#73809b] max-w-md mx-auto">
                Whenever you get stuck on a tricky question, click &ldquo;Request Written Solution&rdquo; to receive a handwritten step-by-step breakdown from a verified mentor.
              </p>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#7564ed] px-4 py-2 text-xs font-bold text-white hover:bg-[#6655df]"
                >
                  <Plus size={15} />
                  <span>Ask a Question</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {completedList.map((sol) => (
                <div
                  key={sol.id}
                  className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-xs transition hover:shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-[#f1f4f9] pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${getSubjectBadge(
                              sol.subject
                            )}`}
                          >
                            {sol.subject}
                          </span>
                          {sol.chapter && (
                            <span className="text-xs font-semibold text-[#73809b]">
                              {sol.chapter}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-[#8a95ab]">
                          Solved by <strong className="text-[#334155]">{sol.mentor?.name || "Mentor"}</strong> on{" "}
                          {new Date(sol.solvedAt || sol.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      {/* 30-day expiration pill */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                          sol.daysRemaining !== null && sol.daysRemaining <= 5
                            ? "bg-[#fee2e2] text-[#dc2626]"
                            : "bg-[#fef3c7] text-[#92400e]"
                        }`}
                        title="Solutions are retained for 30 days from date sent"
                      >
                        <Clock size={11} />
                        {sol.daysRemaining !== null ? `${sol.daysRemaining} days left` : "30 days"}
                      </span>
                    </div>

                    {/* Original question */}
                    <div className="rounded-xl bg-[#f8fafc] p-3.5 border border-[#e9eef5]">
                      <p className="text-[11px] font-bold text-[#64748b] mb-1">Your Question:</p>
                      <p className="text-xs sm:text-sm font-semibold text-[#1e293b] leading-relaxed">
                        {sol.questionText}
                      </p>
                      {sol.hasQuestionImage && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() =>
                              setViewingImage({
                                url: sol.questionImageUrl,
                                title: `Question Photo - ${sol.subject}`,
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6366f1] hover:underline"
                          >
                            <ImageIcon size={12} />
                            <span>View attached question photo</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Solution Photo Preview */}
                    {sol.hasSolution && (
                      <div className="rounded-xl border border-[#cbd5e1] bg-[#fafafa] p-3">
                        <p className="text-[11px] font-extrabold text-[#334155] mb-2 flex items-center justify-between">
                          <span>Handwritten Solution:</span>
                          <span className="text-[10px] font-semibold text-[#2c967b]">
                            ✓ Verified by Mentor
                          </span>
                        </p>
                        <div
                          onClick={() =>
                            setViewingImage({
                              url: sol.solutionImageUrl,
                              title: `Handwritten Solution - ${sol.subject} (${sol.chapter || ""})`,
                            })
                          }
                          className="group relative cursor-pointer overflow-hidden rounded-lg border border-[#e2e8f0] bg-white"
                        >
                          <img
                            src={sol.solutionImageUrl}
                            alt="Handwritten solution"
                            className="h-44 w-full object-cover transition group-hover:scale-102"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#1e293b] shadow-md">
                              <Eye size={14} className="text-[#6366f1]" /> Click to zoom solution
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mentor notes */}
                    {sol.mentorNotes && (
                      <div className="rounded-xl border border-[#ede9fe] bg-[#f5f3ff] p-3 text-xs text-[#5b21b6]">
                        <p className="font-bold flex items-center gap-1 mb-0.5">
                          <Sparkles size={12} /> Mentor Note:
                        </p>
                        <p className="italic leading-relaxed">{sol.mentorNotes}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#f1f4f9] flex items-center justify-between text-[11px] text-[#8a95ab]">
                    <span>30-Day Access Policy</span>
                    <button
                      type="button"
                      onClick={() =>
                        setViewingImage({
                          url: sol.solutionImageUrl,
                          title: `Handwritten Solution - ${sol.subject}`,
                        })
                      }
                      className="font-bold text-[#7564ed] hover:underline"
                    >
                      Open Full Solution →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* PENDING / IN-PROGRESS REQUESTS */
        <div className="space-y-4">
          {pendingList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d2d9e6] bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e4f8f5] text-[#2c967b]">
                <CheckCircle2 size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-[#18223c]">No active requests</h3>
              <p className="mt-1 text-xs text-[#73809b]">
                All your written solution requests have been answered!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingList.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-[#e4e8f1] bg-white p-5 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${getSubjectBadge(
                          req.subject
                        )}`}
                      >
                        {req.subject}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                          req.status === "Assigned"
                            ? "bg-[#e0e7ff] text-[#3730a3]"
                            : "bg-[#fef3c7] text-[#92400e]"
                        }`}
                      >
                        {req.status === "Assigned"
                          ? "MENTOR SOLVING"
                          : "AWAITING MENTOR"}
                      </span>
                    </div>

                    {req.chapter && (
                      <p className="text-xs font-semibold text-[#73809b]">{req.chapter}</p>
                    )}

                    <p className="line-clamp-4 text-xs sm:text-sm font-semibold text-[#1e293b]">
                      {req.questionText}
                    </p>

                    {req.hasQuestionImage && (
                      <button
                        type="button"
                        onClick={() =>
                          setViewingImage({
                            url: req.questionImageUrl,
                            title: `Question Photo - ${req.subject}`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6366f1] hover:underline"
                      >
                        <ImageIcon size={13} />
                        <span>View your attached photo</span>
                      </button>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#f1f4f9] text-[11px] text-[#8a95ab] flex items-center justify-between">
                    <span>Req ID: {req.requestId}</span>
                    <span>
                      {new Date(req.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Request Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
        >
          <div className="relative max-h-[90vh] max-w-xl w-full rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#f0edff] text-[#7564ed]">
                  <PenTool size={16} />
                </span>
                <h3 className="text-base font-extrabold text-[#18223c]">
                  Request Written Solution
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-[#64748b] hover:bg-[#f1f5f9]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Subject <span className="text-[#ef4444]">*</span>
                </label>
                <select
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full rounded-xl border border-[#cbd5e1] p-2.5 text-xs sm:text-sm font-semibold text-[#1e293b]"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Chapter / Topic (optional)
                </label>
                <input
                  type="text"
                  value={formChapter}
                  onChange={(e) => setFormChapter(e.target.value)}
                  placeholder="e.g. Thermodynamics, Coordinate Geometry"
                  className="w-full rounded-xl border border-[#cbd5e1] p-2.5 text-xs sm:text-sm text-[#1e293b]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Question Text / Description <span className="text-[#ef4444]">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="Type the full question or specific step where you are stuck..."
                  className="w-full rounded-xl border border-[#cbd5e1] p-3 text-xs sm:text-sm text-[#1e293b]"
                />
              </div>

              {/* Optional Photo Attachment */}
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Attach Photo of Question (optional)
                </label>
                {formPhotoPreview ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-2.5">
                    <div className="flex items-center gap-2">
                      <img
                        src={formPhotoPreview}
                        alt="Question preview"
                        className="h-12 w-12 rounded-lg object-cover border"
                      />
                      <span className="text-xs font-bold text-[#1e293b]">
                        {formPhoto?.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearFormPhoto}
                      className="rounded-lg p-1 text-[#ef4444] hover:bg-[#fee2e2]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-3 text-center transition hover:border-[#7564ed]"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
                    />
                    <UploadCloud size={18} className="text-[#7564ed]" />
                    <span className="text-xs font-bold text-[#475569]">
                      Upload question photo (optional, max 15MB)
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#f1f4f9]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-[#cbd5e1] px-4 py-2 text-xs font-bold text-[#475569] hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#7564ed] px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#6655df] disabled:opacity-50"
                >
                  <Send size={15} />
                  <span>{submitting ? "Submitting..." : "Submit Request"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Modal Viewer */}
      {viewingImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
        >
          <div className="relative max-h-[90vh] max-w-4xl w-full rounded-2xl bg-white p-4 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <h3 className="text-sm font-bold text-[#1e293b]">{viewingImage.title}</h3>
              <button
                type="button"
                onClick={() => setViewingImage(null)}
                className="rounded-lg p-1 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-3 flex-1 overflow-auto flex items-center justify-center bg-[#0f172a] rounded-xl p-2 min-h-[300px]">
              <img
                src={viewingImage.url}
                alt={viewingImage.title}
                className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

