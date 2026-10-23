"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Clock,
  Calendar,
  XCircle,
  CheckCircle2,
  FileText,
  Search,
  ArrowUpDown,
  ExternalLink,
  Eye,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import AdminHeader from "@/components/AdminHeader";

const STATUS_CONFIG = {
  Pending: {
    label: "Pending",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
    cardBorder: "border-amber-200",
    iconBg: "bg-amber-50 text-amber-600 border-amber-200",
    icon: Clock,
  },
  "Under Review": {
    label: "Under Review",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    cardBorder: "border-blue-200",
    iconBg: "bg-blue-50 text-blue-600 border-blue-200",
    icon: Search,
  },
  "Interview Scheduled": {
    label: "Interview Scheduled",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
    cardBorder: "border-purple-200",
    iconBg: "bg-purple-50 text-purple-600 border-purple-200",
    icon: Calendar,
  },
  Accepted: {
    label: "Accepted",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    cardBorder: "border-emerald-200",
    iconBg: "bg-emerald-50 text-emerald-600 border-emerald-200",
    icon: CheckCircle2,
  },
  Declined: {
    label: "Declined",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    cardBorder: "border-rose-200",
    iconBg: "bg-rose-50 text-rose-600 border-rose-200",
    icon: XCircle,
  },
};

const SORT_OPTIONS = [
  { value: "createdAt-desc", label: "Newest First", sortBy: "createdAt", sortOrder: "desc" },
  { value: "createdAt-asc", label: "Oldest First", sortBy: "createdAt", sortOrder: "asc" },
  { value: "experience-desc", label: "Most Experience", sortBy: "experience", sortOrder: "desc" },
  { value: "name-asc", label: "Name (A to Z)", sortBy: "name", sortOrder: "asc" },
];

export default function AdminDashboardPage() {
  const router = useRouter();

  // Auth & Page States
  const [access, setAccess] = useState("loading"); // "loading" | "authorized" | "denied"

  // Data
  const [applications, setApplications] = useState([]);
  const [counts, setCounts] = useState({
    Total: 0,
    Pending: 0,
    "Under Review": 0,
    "Interview Scheduled": 0,
    Accepted: 0,
    Declined: 0,
  });

  // Filters & Search
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortValue, setSortValue] = useState("createdAt-desc");
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Modals & Active selections
  const [selectedApp, setSelectedApp] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [interviewApp, setInterviewApp] = useState(null);

  // Action states
  const [actionBusy, setActionBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [adminNotesDraft, setAdminNotesDraft] = useState("");

  // Interview form state
  const [interviewForm, setInterviewForm] = useState({
    date: "",
    time: "",
    mode: "Google Meet",
    link: "",
    notifyCandidate: true,
  });

  // Access Verification and Data Loading
  const checkAccessAndLoad = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const [sortBy, sortOrder] = sortValue.split("-");
      const url = new URL("/api/admin/mentor-applications", window.location.origin);
      if (selectedStatus !== "All") url.searchParams.set("status", selectedStatus);
      if (searchQuery.trim()) url.searchParams.set("search", searchQuery.trim());
      url.searchParams.set("sortBy", sortBy);
      url.searchParams.set("sortOrder", sortOrder);

      const res = await fetch(url.toString());
      if (res.status === 401 || res.status === 403) {
        setAccess("denied");
        return;
      }

      if (!res.ok) {
        setFeedback({ type: "error", message: "Failed to load mentor applications." });
        setAccess("authorized");
        return;
      }

      const data = await res.json();
      setApplications(data.applications || []);
      setCounts(
        data.counts || {
          Total: 0,
          Pending: 0,
          "Under Review": 0,
          "Interview Scheduled": 0,
          Accepted: 0,
          Declined: 0,
        }
      );
      setAccess("authorized");
    } catch (err) {
      console.error("Access verification error:", err);
      setAccess("denied");
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedStatus, searchQuery, sortValue]);

  useEffect(() => {
    checkAccessAndLoad();
  }, [checkAccessAndLoad]);

  // Open Details Modal
  const openDetail = (app) => {
    setSelectedApp(app);
    setAdminNotesDraft(app.adminNotes || "");
    setIsDetailOpen(true);
  };

  // Open Interview Modal
  const openInterviewModal = (app) => {
    setInterviewApp(app);
    if (app.interview) {
      setInterviewForm({
        date: app.interview.date ? app.interview.date.split("T")[0] : "",
        time: app.interview.time || "",
        mode: app.interview.mode || "Google Meet",
        link: app.interview.link || "",
        notifyCandidate: true,
      });
    } else {
      setInterviewForm({
        date: "",
        time: "11:00 AM IST",
        mode: "Google Meet",
        link: "",
        notifyCandidate: true,
      });
    }
    setIsInterviewModalOpen(true);
  };

  // Update Application helper
  const updateApplication = async (id, payload, successMsg) => {
    setActionBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/mentor-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update application.");
      }

      setFeedback({ type: "success", message: successMsg || "Application updated successfully." });

      if (data.application) {
        setApplications((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...data.application } : item))
        );
        if (selectedApp && selectedApp.id === id) {
          setSelectedApp(data.application);
          setAdminNotesDraft(data.application.adminNotes || "");
        }
      }

      checkAccessAndLoad();
      return true;
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "An error occurred." });
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const handleMoveToUnderReview = async (app) => {
    await updateApplication(
      app.id,
      { status: "Under Review" },
      `Application for ${app.fullName} moved to Under Review.`
    );
  };

  const handleAccept = async (app) => {
    if (
      !confirm(
        `Are you sure you want to ACCEPT ${app.fullName}? This will approve their mentor profile and grant them mentor dashboard access.`
      )
    ) {
      return;
    }
    const ok = await updateApplication(
      app.id,
      { status: "Accepted" },
      `Accepted! ${app.fullName} is now an approved Mentor.`
    );
    if (ok && isDetailOpen) setIsDetailOpen(false);
  };

  const handleDecline = async (app) => {
    if (
      !confirm(
        `Are you sure you want to DECLINE ${app.fullName}'s application?`
      )
    ) {
      return;
    }
    const ok = await updateApplication(
      app.id,
      { status: "Declined" },
      `Application for ${app.fullName} has been declined.`
    );
    if (ok && isDetailOpen) setIsDetailOpen(false);
  };

  const handleSaveNotes = async () => {
    if (!selectedApp) return;
    await updateApplication(
      selectedApp.id,
      { adminNotes: adminNotesDraft },
      "Internal notes saved successfully."
    );
  };

  const handleScheduleInterviewSubmit = async (e) => {
    e.preventDefault();
    if (!interviewApp) return;
    if (!interviewForm.date) {
      setFeedback({ type: "error", message: "Please select an interview date." });
      return;
    }

    const payload = {
      status: "Interview Scheduled",
      interviewDate: interviewForm.date,
      interviewTime: interviewForm.time,
      meetingMode: interviewForm.mode,
      meetingLink: interviewForm.link,
      notifyCandidate: interviewForm.notifyCandidate,
    };

    const ok = await updateApplication(
      interviewApp.id,
      payload,
      `Interview scheduled for ${interviewApp.fullName} on ${interviewForm.date} at ${interviewForm.time || "TBD"}.`
    );

    if (ok) {
      setIsInterviewModalOpen(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  // --- RENDER STATES ---

  if (access === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f8fc] text-sm text-[#73809b]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-7 w-7 animate-spin text-[#6366f1]" />
          <p className="font-semibold tracking-wide text-[#46516b]">Authenticating Admin Access...</p>
        </div>
      </main>
    );
  }

  if (access === "denied") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f8fc] p-6 text-[#18223c]">
        <div className="w-full max-w-md rounded-2xl border border-[#e4e8f1] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 border border-rose-200">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-[#18223c]">Admin Access Required</h1>
          <p className="mt-3 text-sm text-[#73809b] leading-relaxed">
            You must be logged in with an administrator account to view and manage mentor
            applications and platform settings.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-[#6366f1] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#5254db] transition-all"
            >
              Sign In as Admin
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] antialiased">
      {/* Consistent Admin Navbar with ONLY Mentor Applications and PYQ Review */}
      <AdminHeader currentTab="mentor-applications" />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-7">
        {/* Banner Feedback / Toasts */}
        {feedback && (
          <div
            className={`flex items-center justify-between rounded-xl p-4 text-sm font-semibold border transition-all ${
              feedback.type === "success"
                ? "bg-[#e9f8f1] text-[#287e65] border-[#c0ebd8]"
                : "bg-[#fff0f2] text-[#bd4a5a] border-[#f4c8ce]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-[#287e65] shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-[#bd4a5a] shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-[#73809b] hover:text-[#18223c] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Section Title & Public Form Link */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">ACADEMIC VERIFICATION</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18223c]">
              Mentor Applications
            </h1>
            <p className="mt-1 text-sm text-[#73809b]">
              Review mentor candidate applications, schedule interviews, inspect credentials, and assign mentor status.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={checkAccessAndLoad}
              disabled={isLoadingData}
              className="inline-flex items-center gap-2 rounded-xl border border-[#dfe5ef] bg-white px-4 py-2 text-xs font-bold text-[#46516b] hover:bg-[#f0f3fa] hover:text-[#18223c] transition-all disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingData ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard
            title="Total Applications"
            count={counts.Total}
            active={selectedStatus === "All"}
            onClick={() => setSelectedStatus("All")}
            color="border-[#dcd8fb] bg-[#f0edff] text-[#6366f1]"
            icon={Users}
          />
          <MetricCard
            title="Pending"
            count={counts.Pending}
            active={selectedStatus === "Pending"}
            onClick={() => setSelectedStatus("Pending")}
            color="border-amber-200 bg-amber-50 text-amber-700"
            icon={Clock}
          />
          <MetricCard
            title="Under Review"
            count={counts["Under Review"]}
            active={selectedStatus === "Under Review"}
            onClick={() => setSelectedStatus("Under Review")}
            color="border-blue-200 bg-blue-50 text-blue-700"
            icon={Search}
          />
          <MetricCard
            title="Interview Set"
            count={counts["Interview Scheduled"]}
            active={selectedStatus === "Interview Scheduled"}
            onClick={() => setSelectedStatus("Interview Scheduled")}
            color="border-purple-200 bg-purple-50 text-purple-700"
            icon={Calendar}
          />
          <MetricCard
            title="Accepted"
            count={counts.Accepted}
            active={selectedStatus === "Accepted"}
            onClick={() => setSelectedStatus("Accepted")}
            color="border-emerald-200 bg-emerald-50 text-emerald-700"
            icon={CheckCircle2}
          />
          <MetricCard
            title="Declined"
            count={counts.Declined}
            active={selectedStatus === "Declined"}
            onClick={() => setSelectedStatus("Declined")}
            color="border-rose-200 bg-rose-50 text-rose-700"
            icon={XCircle}
          />
        </div>

        {/* Filter, Search & Sorting Controls */}
        <div className="rounded-2xl border border-[#e4e8f1] bg-white p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8993ac]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, college, subjects, or ID..."
                className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] py-2.5 pl-10 pr-9 text-xs sm:text-sm text-[#18223c] placeholder-[#8993ac] outline-none focus:border-[#6366f1] focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8993ac] hover:text-[#18223c]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-[#46516b] flex items-center gap-1.5 whitespace-nowrap">
                <ArrowUpDown className="h-3.5 w-3.5 text-[#8993ac]" />
                Sort:
              </span>
              <select
                value={sortValue}
                onChange={(e) => setSortValue(e.target.value)}
                className="rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3 py-2 text-xs sm:text-sm text-[#18223c] outline-none focus:border-[#6366f1] focus:bg-white transition-all"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Tabs Bar */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-[#e4e8f1] pt-3">
            {["All", "Pending", "Under Review", "Interview Scheduled", "Accepted", "Declined"].map(
              (status) => {
                const isSelected = selectedStatus === status;
                const count = status === "All" ? counts.Total : counts[status] || 0;
                return (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-[#6366f1] text-white shadow-sm"
                        : "border border-[#dfe5ef] bg-white text-[#46516b] hover:bg-[#f0f3fa] hover:text-[#18223c]"
                    }`}
                  >
                    <span>{status}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        isSelected ? "bg-[#5254db] text-white" : "bg-[#f0f3fa] text-[#46516b]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#8993ac]">
              Showing {applications.length} {applications.length === 1 ? "applicant" : "applicants"}
              {selectedStatus !== "All" && ` with status "${selectedStatus}"`}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>

          {applications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dfe5ef] bg-white p-12 text-center shadow-sm">
              <Users className="mx-auto h-12 w-12 text-[#8993ac]" />
              <h3 className="mt-4 text-base font-bold text-[#18223c]">No Mentor Applications Found</h3>
              <p className="mt-1 text-xs text-[#73809b] max-w-sm mx-auto">
                No applicants match the current filter criteria. Try clearing the search or switching
                status tabs.
              </p>
              {(searchQuery || selectedStatus !== "All") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedStatus("All");
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-4 py-2 text-xs font-bold text-[#46516b] hover:bg-[#f0f3fa] hover:text-[#18223c] transition-all"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3.5">
              {applications.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  onView={() => openDetail(app)}
                  onReview={() => handleMoveToUnderReview(app)}
                  onScheduleInterview={() => openInterviewModal(app)}
                  onAccept={() => handleAccept(app)}
                  onDecline={() => handleDecline(app)}
                  actionBusy={actionBusy}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Detail Drawer Modal */}
      {isDetailOpen && selectedApp && (
        <ApplicationDetailModal
          app={selectedApp}
          onClose={() => setIsDetailOpen(false)}
          onMoveToReview={() => handleMoveToUnderReview(selectedApp)}
          onOpenInterview={() => {
            setIsDetailOpen(false);
            openInterviewModal(selectedApp);
          }}
          onAccept={() => handleAccept(selectedApp)}
          onDecline={() => handleDecline(selectedApp)}
          adminNotesDraft={adminNotesDraft}
          setAdminNotesDraft={setAdminNotesDraft}
          onSaveNotes={handleSaveNotes}
          actionBusy={actionBusy}
          formatDate={formatDate}
          formatFileSize={formatFileSize}
        />
      )}

      {/* Schedule Interview Modal */}
      {isInterviewModalOpen && interviewApp && (
        <ScheduleInterviewModal
          app={interviewApp}
          form={interviewForm}
          setForm={setInterviewForm}
          onSubmit={handleScheduleInterviewSubmit}
          onClose={() => setIsInterviewModalOpen(false)}
          actionBusy={actionBusy}
        />
      )}
    </div>
  );
}

// Subcomponent: Metric Card
function MetricCard({ title, count, active, onClick, color, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all hover:scale-[1.02] shadow-sm ${
        active
          ? "border-[#6366f1] bg-[#f5f4ff] ring-2 ring-[#6366f1]/30"
          : "border-[#e4e8f1] bg-white hover:border-[#cbd5e1]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#73809b]">
          {title}
        </span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-black tracking-tight text-[#18223c]">{count}</p>
    </button>
  );
}

// Subcomponent: Application Card
function ApplicationCard({
  app,
  onView,
  onReview,
  onScheduleInterview,
  onAccept,
  onDecline,
  actionBusy,
  formatDate,
}) {
  const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.Pending;
  const subjects = (app.subjects || "").split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="group rounded-2xl border border-[#e4e8f1] bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-[#cbd5e1] hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Column: Applicant Core Info */}
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base font-extrabold text-[#18223c] group-hover:text-[#6366f1] transition-colors">
              {app.fullName}
            </h3>
            <span className="rounded-md bg-[#fafbfe] px-2 py-0.5 text-[10px] font-mono font-bold text-[#73809b] border border-[#dfe5ef]">
              {app.applicationId}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusCfg.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
              {app.status}
            </span>
            {app.interview?.date && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-md px-2 py-0.5">
                <Calendar className="h-3 w-3" />
                {app.interview.date.split("T")[0]} {app.interview.time}
              </span>
            )}
          </div>

          {/* Details Row */}
          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#73809b]">
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-[#8993ac]" />
              {app.email}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-[#8993ac]" />
              {app.phone}
            </span>
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5 text-[#8993ac]" />
              {app.highestQualification} {app.institute ? `• ${app.institute}` : ""}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5 text-[#8993ac]" />
              {app.experienceYears} {app.experienceYears === 1 ? "yr" : "yrs"} exp
              {app.currentProfession ? ` (${app.currentProfession})` : ""}
            </span>
          </div>

          {/* Subjects & Mode Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {subjects.map((subj) => (
              <span
                key={subj}
                className="rounded-md bg-[#f0edff] border border-[#dcd8fb] px-2 py-0.5 text-[11px] font-bold text-[#6366f1]"
              >
                {subj}
              </span>
            ))}
            {app.preferredMode && (
              <span className="rounded-md bg-[#fafbfe] border border-[#dfe5ef] px-2 py-0.5 text-[11px] font-bold text-[#46516b]">
                Mode: {app.preferredMode}
              </span>
            )}
            <span className="text-[11px] text-[#8993ac] ml-1">
              Submitted: {formatDate(app.createdAt)}
            </span>
          </div>
        </div>

        {/* Right Column: Actions */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[#e4e8f1] pt-3 lg:border-t-0 lg:pt-0">
          <a
            href={`/api/admin/mentor-applications/${app.id}/resume`}
            target="_blank"
            rel="noopener noreferrer"
            title="Download or Preview Resume"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3 py-2 text-xs font-bold text-[#46516b] hover:bg-[#f0f3fa] hover:text-[#18223c] transition-all shadow-sm"
          >
            <FileText className="h-3.5 w-3.5 text-[#6366f1]" />
            Resume
          </a>

          <button
            onClick={onView}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#dcd8fb] bg-[#f0edff] px-3.5 py-2 text-xs font-bold text-[#6366f1] hover:bg-[#6366f1] hover:text-white transition-all shadow-sm"
          >
            <Eye className="h-3.5 w-3.5" />
            Full Details
          </button>

          {app.status !== "Accepted" && app.status !== "Declined" && (
            <button
              onClick={onScheduleInterview}
              disabled={actionBusy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-600 hover:text-white transition-all disabled:opacity-50 shadow-sm"
            >
              <Calendar className="h-3.5 w-3.5" />
              Interview
            </button>
          )}

          {app.status === "Pending" && (
            <button
              onClick={onReview}
              disabled={actionBusy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 shadow-sm"
            >
              <Search className="h-3.5 w-3.5" />
              Mark Review
            </button>
          )}

          {app.status !== "Accepted" && (
            <button
              onClick={onAccept}
              disabled={actionBusy}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm"
            >
              <Check className="h-3.5 w-3.5" />
              Accept
            </button>
          )}

          {app.status !== "Declined" && (
            <button
              onClick={onDecline}
              disabled={actionBusy}
              title="Decline Application"
              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50 shadow-sm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Application Detail Modal (Drawer)
function ApplicationDetailModal({
  app,
  onClose,
  onMoveToReview,
  onOpenInterview,
  onAccept,
  onDecline,
  adminNotesDraft,
  setAdminNotesDraft,
  onSaveNotes,
  actionBusy,
  formatDate,
  formatFileSize,
}) {
  const statusCfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.Pending;
  const subjects = (app.subjects || "").split(",").map((s) => s.trim()).filter(Boolean);
  const targetExams = (app.targetExams || "").split(",").map((e) => e.trim()).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl border border-[#e4e8f1] bg-white p-6 sm:p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-xl bg-[#fafbfe] border border-[#dfe5ef] text-[#73809b] hover:bg-[#f0f3fa] hover:text-[#18223c] transition-all"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-2 border-b border-[#e4e8f1] pb-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-md bg-[#fafbfe] px-2.5 py-0.5 text-xs font-mono font-bold text-[#73809b] border border-[#dfe5ef]">
              {app.applicationId}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-bold ${statusCfg.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
              {app.status}
            </span>
            <span className="text-xs text-[#73809b]">Submitted on {formatDate(app.createdAt)}</span>
          </div>
          <h2 className="text-2xl font-black text-[#18223c]">{app.fullName}</h2>
          <p className="text-xs text-[#73809b]">
            {app.currentProfession || "Educator"} • {app.highestQualification} (
            {app.institute || "Not specified"})
          </p>
        </div>

        <div className="mt-6 space-y-5">
          {/* Contact Details */}
          <div className="rounded-2xl border border-[#e4e8f1] bg-[#fafbfe] p-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#46516b] mb-3">
              Contact & Social Info
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#18223c]">
                <Mail className="h-4 w-4 text-[#6366f1]" />
                <a href={`mailto:${app.email}`} className="hover:underline">
                  {app.email}
                </a>
              </div>
              <div className="flex items-center gap-2 text-[#18223c]">
                <Phone className="h-4 w-4 text-[#6366f1]" />
                <a href={`tel:${app.phone}`} className="hover:underline">
                  {app.phone}
                </a>
              </div>
              {app.linkedInUrl && (
                <div className="sm:col-span-2 flex items-center gap-2 text-[#18223c]">
                  <ExternalLink className="h-4 w-4 text-blue-600" />
                  <a
                    href={app.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate"
                  >
                    {app.linkedInUrl}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Academic & Teaching Background */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#e4e8f1] bg-[#fafbfe] p-4 space-y-2">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#73809b]">
                Total Experience
              </p>
              <p className="text-lg font-black text-[#18223c]">
                {app.experienceYears} {app.experienceYears === 1 ? "Year" : "Years"}
              </p>
              <p className="text-xs text-[#73809b]">
                Weekly Availability:{" "}
                <span className="font-bold text-[#18223c]">
                  {app.availabilityHours || 10} hrs/week
                </span>
              </p>
              <p className="text-xs text-[#73809b]">
                Preferred Mode:{" "}
                <span className="font-bold text-[#18223c]">{app.preferredMode || "Online"}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-[#e4e8f1] bg-[#fafbfe] p-4 space-y-2">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#73809b]">
                Target Exams
              </p>
              <div className="flex flex-wrap gap-1.5">
                {targetExams.length ? (
                  targetExams.map((exam) => (
                    <span
                      key={exam}
                      className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-xs font-bold text-purple-700"
                    >
                      {exam}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#73809b]">JEE Main, JEE Advanced</span>
                )}
              </div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#73809b] pt-1.5">
                Expertise Subjects
              </p>
              <div className="flex flex-wrap gap-1.5">
                {subjects.map((sub) => (
                  <span
                    key={sub}
                    className="rounded-md bg-[#f0edff] border border-[#dcd8fb] px-2 py-0.5 text-xs font-bold text-[#6366f1]"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Short Bio */}
          {app.bio && (
            <div className="rounded-2xl border border-[#e4e8f1] bg-[#fafbfe] p-4 space-y-1.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#46516b]">
                Professional Bio
              </h4>
              <p className="text-xs leading-relaxed text-[#18223c] whitespace-pre-wrap">{app.bio}</p>
            </div>
          )}

          {/* Teaching Experience */}
          {app.teachingExperience && (
            <div className="rounded-2xl border border-[#e4e8f1] bg-[#fafbfe] p-4 space-y-1.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#46516b]">
                Mentoring & Pedagogy Experience
              </h4>
              <p className="text-xs leading-relaxed text-[#18223c] whitespace-pre-wrap">
                {app.teachingExperience}
              </p>
            </div>
          )}

          {/* Resume Box */}
          <div className="rounded-2xl border border-[#e4e8f1] bg-[#fafbfe] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0edff] text-[#6366f1] border border-[#dcd8fb]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#18223c]">
                  {app.resume?.originalName || "Candidate_Resume.pdf"}
                </p>
                <p className="text-[11px] text-[#73809b]">
                  {formatFileSize(app.resume?.size)} • PDF Document
                </p>
              </div>
            </div>
            <a
              href={`/api/admin/mentor-applications/${app.id}/resume`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#6366f1] px-4 py-2 text-xs font-bold text-white hover:bg-[#5254db] transition-all shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open & Verify Resume
            </a>
          </div>

          {/* Interview Details */}
          {app.interview?.date && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-purple-700">
                <Calendar className="h-4 w-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Scheduled Interview</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#18223c]">
                <div>
                  <span className="text-[#73809b]">Date & Time: </span>
                  <span className="font-bold text-[#18223c]">
                    {app.interview.date.split("T")[0]} at {app.interview.time || "TBD"}
                  </span>
                </div>
                <div>
                  <span className="text-[#73809b]">Mode: </span>
                  <span className="font-bold text-[#18223c]">{app.interview.mode || "Online"}</span>
                </div>
                {app.interview.link && (
                  <div className="sm:col-span-2">
                    <span className="text-[#73809b]">Meeting Link: </span>
                    <a
                      href={app.interview.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6366f1] hover:underline break-all font-semibold"
                    >
                      {app.interview.link}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internal Admin Notes */}
          <div className="rounded-2xl border border-[#e4e8f1] bg-[#fafbfe] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#46516b]">
                Internal Admin Notes (Private)
              </h4>
              {app.reviewedBy && (
                <span className="text-[11px] text-[#73809b]">
                  Last reviewed by {app.reviewedBy} on {formatDate(app.reviewedAt)}
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={adminNotesDraft}
              onChange={(e) => setAdminNotesDraft(e.target.value)}
              placeholder="Add internal evaluation feedback, interview comments, or notes..."
              className="w-full rounded-xl border border-[#dfe5ef] bg-white p-3 text-xs text-[#18223c] placeholder-[#8993ac] outline-none focus:border-[#6366f1]"
            />
            <div className="flex justify-end">
              <button
                onClick={onSaveNotes}
                disabled={actionBusy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe5ef] bg-white px-3.5 py-1.5 text-xs font-bold text-[#46516b] hover:bg-[#f0f3fa] hover:text-[#18223c] transition-all disabled:opacity-50 shadow-sm"
              >
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Save Notes
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e8f1] pt-5">
          <div className="flex flex-wrap items-center gap-2">
            {app.status === "Pending" && (
              <button
                onClick={onMoveToReview}
                disabled={actionBusy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
              >
                <Search className="h-3.5 w-3.5" />
                Move to Under Review
              </button>
            )}

            <button
              onClick={onOpenInterview}
              disabled={actionBusy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-600 hover:text-white transition-all disabled:opacity-50"
            >
              <Calendar className="h-3.5 w-3.5" />
              Schedule / Update Interview
            </button>
          </div>

          <div className="flex items-center gap-2">
            {app.status !== "Declined" && (
              <button
                onClick={onDecline}
                disabled={actionBusy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Decline
              </button>
            )}

            {app.status !== "Accepted" && (
              <button
                onClick={onAccept}
                disabled={actionBusy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Accept & Grant Mentor Role
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Interview Scheduling Modal
function ScheduleInterviewModal({ app, form, setForm, onSubmit, onClose, actionBusy }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl border border-[#e4e8f1] bg-white p-6 sm:p-7 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-xl bg-[#fafbfe] border border-[#dfe5ef] text-[#73809b] hover:bg-[#f0f3fa] hover:text-[#18223c] transition-all"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-[#18223c]">Schedule Candidate Interview</h3>
            <p className="text-xs text-[#73809b]">
              For <span className="font-bold text-[#18223c]">{app.fullName}</span> ({app.email})
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#46516b] mb-1">
                Interview Date *
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3 py-2 text-xs text-[#18223c] outline-none focus:border-[#6366f1] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#46516b] mb-1">
                Interview Time *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 11:00 AM IST"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3 py-2 text-xs text-[#18223c] outline-none focus:border-[#6366f1] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#46516b] mb-1">
              Interview Mode
            </label>
            <select
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value })}
              className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3 py-2 text-xs text-[#18223c] outline-none focus:border-[#6366f1] focus:bg-white"
            >
              <option value="Google Meet">Google Meet</option>
              <option value="Zoom">Zoom Meeting</option>
              <option value="Microsoft Teams">Microsoft Teams</option>
              <option value="Phone Call">Phone Call</option>
              <option value="In-Person">In-Person</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#46516b] mb-1">
              Meeting Link or Location
            </label>
            <input
              type="text"
              placeholder="https://meet.google.com/xyz-abcd-efg"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3 py-2 text-xs text-[#18223c] outline-none focus:border-[#6366f1] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <input
              type="checkbox"
              id="notifyCandidate"
              checked={form.notifyCandidate}
              onChange={(e) => setForm({ ...form, notifyCandidate: e.target.checked })}
              className="h-4 w-4 rounded border-[#dfe5ef] text-[#6366f1] focus:ring-[#6366f1]"
            />
            <label htmlFor="notifyCandidate" className="text-xs font-medium text-[#46516b]">
              Send interview notification email to applicant ({app.email})
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#e4e8f1]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-4 py-2 text-xs font-bold text-[#46516b] hover:bg-[#f0f3fa] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionBusy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 transition-all"
            >
              <Calendar className="h-3.5 w-3.5" />
              Confirm Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
