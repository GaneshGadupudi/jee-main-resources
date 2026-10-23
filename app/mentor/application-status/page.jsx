"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Video,
  XCircle,
  FileCheck,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Shield,
  UserCheck,
} from "lucide-react";
import MentorHeader from "@/components/MentorHeader";
import SiteFooter from "@/components/SiteFooter";

const STATUS_STEPS = ["Pending", "Under Review", "Interview Scheduled", "Accepted"];

export default function ApplicationStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#f7f8fc] text-sm text-[#73809b]">
          Loading application status...
        </div>
      }
    >
      <ApplicationStatusContent />
    </Suspense>
  );
}

function ApplicationStatusContent() {
  const searchParams = useSearchParams();
  const initialAppId = searchParams.get("applicationId") || "";

  const [query, setQuery] = useState(initialAppId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const fetchStatus = async (lookupTerm) => {
    if (!lookupTerm?.trim()) return;
    setLoading(true);
    setError("");
    try {
      const isEmail = lookupTerm.includes("@");
      const paramKey = isEmail ? "email" : "applicationId";
      const res = await fetch(`/api/mentor/application-status?${paramKey}=${encodeURIComponent(lookupTerm.trim())}`);
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Application not found.");
      }
      setData(result.application);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Unable to find application.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialAppId) {
      fetchStatus(initialAppId);
    } else {
      // Check if logged in user has an application
      fetch("/api/mentor/application-status")
        .then((r) => r.json())
        .then((res) => {
          if (res.application) setData(res.application);
        })
        .catch(() => {});
    }
  }, [initialAppId]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchStatus(query);
  };

  const getStepIndex = (status) => {
    if (status === "Declined") return -1;
    return STATUS_STEPS.indexOf(status);
  };

  return (
    <>
      <MentorHeader currentTab="application-status" />
      <main className="min-h-screen bg-[#f7f8fc] pb-24 pt-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dcd8fb] bg-[#f4f3ff] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#6353c6]">
              <FileCheck size={13} /> Application Tracker
            </span>
            <h1 className="mt-3 text-3xl font-extrabold text-[#18223c]">
              Mentor Application Status
            </h1>
            <p className="mt-2 text-sm text-[#73809b] max-w-md mx-auto">
              Track the verification status of your mentor registration in real time.
            </p>
          </div>

          {/* Search Box */}
          <div className="rounded-2xl border border-[#dfe5ef] bg-white p-4 shadow-sm mb-8">
            <form onSubmit={handleSearch} className="flex gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter Application ID (e.g. APP-2026-12345) or Email..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-4 py-2.5 text-sm outline-none focus:border-[#7564ed] focus:ring-2 focus:ring-[#7564ed]/15 transition"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-[#7564ed] px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-[#6655df] transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {loading ? "Checking…" : <><Search size={15} /> Track</>}
              </button>
            </form>
          </div>

          {error && (
            <div className="rounded-2xl border border-[#fecaca] bg-[#fff1f2] p-4 text-xs sm:text-sm font-bold text-[#991b1b] flex items-center gap-3 shadow-xs mb-8">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Card */}
          {data && (
            <div className="rounded-3xl border border-[#e4e8f1] bg-white p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#edf0f5] pb-5">
                <div>
                  <span className="text-xs font-mono font-bold text-[#6353c6] block mb-1">
                    {data.applicationId}
                  </span>
                  <h2 className="text-xl font-extrabold text-[#18223c]">{data.fullName}</h2>
                  <p className="text-xs text-[#73809b]">{data.email}</p>
                </div>

                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      data.status === "Accepted"
                        ? "bg-[#e4f8f5] text-[#247b70]"
                        : data.status === "Interview Scheduled"
                        ? "bg-[#f0edff] text-[#6353c6]"
                        : data.status === "Under Review"
                        ? "bg-[#e0e7ff] text-[#3730a3]"
                        : data.status === "Declined"
                        ? "bg-[#fee2e2] text-[#991b1b]"
                        : "bg-[#fef3c7] text-[#92400e]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        data.status === "Accepted"
                          ? "bg-[#2c967b]"
                          : data.status === "Interview Scheduled"
                          ? "bg-[#7564ed] animate-pulse"
                          : data.status === "Declined"
                          ? "bg-[#dc2626]"
                          : "bg-[#d97706]"
                      }`}
                    />
                    {data.status}
                  </span>
                </div>
              </div>

              {/* Progress Stepper (if not Declined) */}
              {data.status !== "Declined" ? (
                <div className="py-2">
                  <div className="grid grid-cols-4 gap-2">
                    {STATUS_STEPS.map((step, idx) => {
                      const currentIdx = getStepIndex(data.status);
                      const isCompleted = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <div key={step} className="text-center">
                          <div
                            className={`h-2 rounded-full mb-2 transition ${
                              isCompleted ? "bg-[#2c967b]" : "bg-[#edf0f5]"
                            }`}
                          />
                          <p
                            className={`text-[11px] sm:text-xs font-bold ${
                              isCurrent
                                ? "text-[#18223c]"
                                : isCompleted
                                ? "text-[#2c967b]"
                                : "text-[#94a3b8]"
                            }`}
                          >
                            {step}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#fecaca] bg-[#fff1f2] p-4 text-xs text-[#991b1b] leading-relaxed">
                  <strong>Application Decision:</strong> Thank you for your interest in the JEE Mentorship Program. After reviewing your credentials, we are unable to accept your application at this time. You may reapply in the next cycle.
                </div>
              )}

              {/* Interview Details Card if Scheduled */}
              {data.interview && (
                <div className="rounded-2xl border border-[#dcd8fb] bg-gradient-to-r from-[#f7f5ff] to-white p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <Video size={18} className="text-[#7564ed]" />
                    <h3 className="text-sm font-extrabold text-[#18223c]">Scheduled Interview Details</h3>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div className="rounded-xl bg-white border border-[#dfe5ef] p-3">
                      <p className="text-[10px] font-extrabold text-[#8993ac] uppercase">Date & Time</p>
                      <p className="font-bold text-[#18223c] mt-0.5">
                        {new Date(data.interview.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at {data.interview.time || "TBD"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white border border-[#dfe5ef] p-3">
                      <p className="text-[10px] font-extrabold text-[#8993ac] uppercase">Mode & Meeting Link</p>
                      <p className="font-bold text-[#18223c] mt-0.5">
                        {data.interview.mode || "Online"}
                        {data.interview.link && (
                          <a
                            href={data.interview.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[#6353c6] underline mt-0.5 font-normal truncate"
                          >
                            {data.interview.link}
                          </a>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* If Accepted Banner */}
              {data.status === "Accepted" && (
                <div className="rounded-2xl border border-[#a7f3d0] bg-[#e4f8f5] p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2c967b] text-white">
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-[#247b70]">You are an Approved JEE Mentor!</h4>
                      <p className="text-xs text-[#247b70]/80">
                        Log in with your email to start accepting live 1-on-1 doubt clearing video calls.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/login"
                    className="rounded-xl bg-[#2c967b] px-4 py-2 text-xs font-bold text-white hover:bg-[#25826a] transition shadow-xs flex items-center gap-1.5"
                  >
                    Go to Mentor Desk <ArrowRight size={14} />
                  </Link>
                </div>
              )}

              {/* Application Details Summary */}
              <div className="grid gap-4 sm:grid-cols-2 text-xs border-t border-[#edf0f5] pt-4">
                <div>
                  <span className="text-[#8993ac] block">Institution</span>
                  <span className="font-bold text-[#27314c]">{data.institute || "Not provided"}</span>
                </div>
                <div>
                  <span className="text-[#8993ac] block">Highest Qualification</span>
                  <span className="font-bold text-[#27314c]">{data.highestQualification}</span>
                </div>
                <div>
                  <span className="text-[#8993ac] block">Subjects</span>
                  <span className="font-bold text-[#27314c]">{data.subjects}</span>
                </div>
                <div>
                  <span className="text-[#8993ac] block">Submission Date</span>
                  <span className="font-bold text-[#27314c]">
                    {new Date(data.createdAt).toLocaleDateString([], {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Help box */}
          <div className="mt-8 text-center text-xs text-[#8a96ad]">
            Need assistance or wish to submit an application?{" "}
            <Link href="/mentor/register" className="font-bold text-[#6353c6] hover:underline">
              Register as a Mentor
            </Link>{" "}
            ·{" "}
            <Link href="/" className="font-bold text-[#6353c6] hover:underline">
              Return Home
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

