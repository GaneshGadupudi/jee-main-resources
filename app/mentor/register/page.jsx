"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  ArrowRight,
  ShieldCheck,
  Video,
  Sparkles,
  BookOpen,
  Clock,
  ExternalLink,
} from "lucide-react";
import MentorHeader from "@/components/MentorHeader";
import SiteFooter from "@/components/SiteFooter";

const SUBJECT_OPTIONS = [
  "Physics - Mechanics",
  "Physics - Electromagnetism & Optics",
  "Physics - Modern Physics & Thermodynamics",
  "Chemistry - Physical Chemistry",
  "Chemistry - Organic Chemistry",
  "Chemistry - Inorganic Chemistry",
  "Mathematics - Calculus",
  "Mathematics - Algebra & Coordinate Geometry",
  "Mathematics - Vectors, 3D & Probability",
];

const QUALIFICATIONS = [
  "B.Tech / B.E. (IIT/NIT/BITS)",
  "M.Tech / M.E.",
  "M.Sc / Integrated M.Sc",
  "Ph.D. / Research Scholar",
  "B.Sc / BS",
  "Other Relevant Professional Degree",
];

export default function MentorRegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [highestQualification, setHighestQualification] = useState(QUALIFICATIONS[0]);
  const [institute, setInstitute] = useState("");
  const [currentProfession, setCurrentProfession] = useState("");
  const [experienceYears, setExperienceYears] = useState("2");
  const [selectedSubjects, setSelectedSubjects] = useState(["Physics - Mechanics"]);
  const [customSubject, setCustomSubject] = useState("");
  const [bio, setBio] = useState("");
  const [teachingExperience, setTeachingExperience] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [availabilityHours, setAvailabilityHours] = useState("10");

  const [resumeFile, setResumeFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [submittedApp, setSubmittedApp] = useState(null);

  const toggleSubject = (subj) => {
    if (selectedSubjects.includes(subj)) {
      if (selectedSubjects.length === 1) return; // Keep at least one
      setSelectedSubjects(selectedSubjects.filter((s) => s !== subj));
    } else {
      setSelectedSubjects([...selectedSubjects, subj]);
    }
  };

  const addCustomSubject = () => {
    if (customSubject.trim() && !selectedSubjects.includes(customSubject.trim())) {
      setSelectedSubjects([...selectedSubjects, customSubject.trim()]);
      setCustomSubject("");
    }
  };

  const handleFileChange = (e) => {
    setFormError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Resume file size must be less than 5 MB.");
      return;
    }

    const validExts = [".pdf", ".doc", ".docx"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExts.includes(ext)) {
      setFormError("Only PDF and Word documents are permitted.");
      return;
    }

    setResumeFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    // Client-side validations
    if (!fullName.trim()) return setFormError("Please enter your Full Name.");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setFormError("Please enter a valid Email Address.");
    }
    if (!phone.trim() || phone.trim().length < 8) {
      return setFormError("Please enter a valid Contact Phone Number.");
    }
    if (!institute.trim()) {
      return setFormError("Please provide your College, University, or Institution.");
    }
    if (!currentProfession.trim()) {
      return setFormError("Please enter your Current Profession or Designation.");
    }
    if (selectedSubjects.length === 0) {
      return setFormError("Please choose at least one Area of Expertise.");
    }
    // Short Professional Bio and Teaching/Mentoring Experience are optional
    if (!resumeFile) {
      return setFormError("Please upload your Resume (PDF preferred, max 5 MB).");
    }

    setBusy(true);

    try {
      const formData = new FormData();
      formData.append("fullName", fullName.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("phone", phone.trim());
      formData.append("highestQualification", highestQualification);
      formData.append("institute", institute.trim());
      formData.append("currentProfession", currentProfession.trim());
      formData.append("experienceYears", experienceYears);
      formData.append("subjects", selectedSubjects.join(", "));
      if (bio.trim()) formData.append("bio", bio.trim());
      if (teachingExperience.trim()) formData.append("teachingExperience", teachingExperience.trim());
      if (linkedInUrl.trim()) formData.append("linkedInUrl", linkedInUrl.trim());
      formData.append("availabilityHours", availabilityHours);
      formData.append("resume", resumeFile);

      const res = await fetch("/api/mentor/register", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application.");
      }

      setSubmittedApp({
        applicationId: data.applicationId,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        createdAt: data.createdAt || new Date().toISOString(),
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to submit your application. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <MentorHeader currentTab="register" />
      <main className="min-h-screen bg-[#f7f8fc] pb-24 pt-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header Card */}
          <div className="rounded-3xl border border-[#dcd8fb] bg-gradient-to-r from-[#f5f2ff] via-white to-[#faf9fe] p-6 sm:p-10 shadow-sm mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dcd8fb] bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#6353c6]">
                  <GraduationCap size={13} /> Mentor Network Registration
                </span>
                <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-[#18223c]">
                  Become a Verified JEE Mentor
                </h1>
                <p className="mt-2 text-sm text-[#69758d] leading-relaxed">
                  Join our elite cohort of IITian & top faculty mentors. Conduct live 1-on-1 doubt clearing calls, guide exam strategy, and help aspirants achieve dream ranks.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/mentor/application-status"
                  className="rounded-xl border border-[#dfe5ef] bg-white px-4 py-2 text-xs font-bold text-[#46516c] hover:bg-[#f7f8fc] transition shadow-xs flex items-center gap-1"
                >
                  Already Applied? Check Status <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          </div>

          {/* Success Screen */}
          {submittedApp ? (
            <div className="rounded-3xl border border-[#a7f3d0] bg-white p-8 sm:p-12 text-center shadow-md animate-in fade-in duration-300">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#e4f8f5] text-[#247b70] mb-5 shadow-xs">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18223c]">
                Application Submitted Successfully!
              </h2>
              <p className="mt-2 text-sm text-[#69758d] max-w-lg mx-auto">
                Thank you, <strong>{submittedApp.fullName}</strong>. We have received your mentor application and resume. Our academic review board will inspect your credentials.
              </p>

              <div className="mt-6 mx-auto max-w-md rounded-2xl border border-[#dfe5ef] bg-[#fafbfe] p-5 text-left shadow-xs">
                <div className="flex justify-between items-center border-b border-[#edf0f5] pb-3 mb-3">
                  <span className="text-xs font-extrabold text-[#8993ac] uppercase tracking-wider">Application ID</span>
                  <span className="font-mono text-sm font-bold text-[#6353c6]">{submittedApp.applicationId}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#edf0f5] pb-3 mb-3">
                  <span className="text-xs font-extrabold text-[#8993ac] uppercase tracking-wider">Applicant Email</span>
                  <span className="text-xs font-bold text-[#27314c]">{submittedApp.email}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#edf0f5] pb-3 mb-3">
                  <span className="text-xs font-extrabold text-[#8993ac] uppercase tracking-wider">Initial Status</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-xs font-bold text-[#92400e]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#d97706]" /> Pending Review
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-[#8993ac] uppercase tracking-wider">Expected Response</span>
                  <span className="text-xs font-bold text-[#46516c]">48 - 72 Hours</span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href={`/mentor/application-status?applicationId=${encodeURIComponent(submittedApp.applicationId)}`}
                  className="rounded-xl bg-[#6366f1] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#5254db] transition flex items-center gap-2"
                >
                  Track Application Status <ArrowRight size={15} />
                </Link>
                <Link
                  href="/"
                  className="rounded-xl border border-[#dfe5ef] bg-white px-5 py-3 text-sm font-bold text-[#46516c] hover:bg-[#f7f8fc] transition"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} noValidate className="space-y-8">
              {formError && (
                <div className="rounded-2xl border border-[#fecaca] bg-[#fff1f2] p-4 text-xs sm:text-sm font-bold text-[#991b1b] flex items-center gap-3 shadow-xs animate-in fade-in">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Section 1: Personal & Contact Details */}
              <section className="rounded-3xl border border-[#e4e8f1] bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 border-b border-[#edf0f5] pb-4 mb-6">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#f0edff] text-[#7564ed] text-xs font-bold">
                    1
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-[#18223c]">Personal & Contact Information</h2>
                    <p className="text-xs text-[#73809b]">How can the academic team reach and verify you?</p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-[#46516b] mb-1.5" htmlFor="fullName">
                      Full Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajesh Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3.5 py-2.5 text-sm outline-none focus:border-[#7564ed] focus:ring-3 focus:ring-[#7564ed]/15 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#46516b] mb-1.5" htmlFor="email">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="e.g. rajesh.sharma@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3.5 py-2.5 text-sm outline-none focus:border-[#7564ed] focus:ring-3 focus:ring-[#7564ed]/15 transition"
                    />
                    <p className="text-[11px] text-[#8a96ad] mt-1">Application updates will be sent here.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#46516b] mb-1.5" htmlFor="phone">
                      Contact Phone / WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3.5 py-2.5 text-sm outline-none focus:border-[#7564ed] focus:ring-3 focus:ring-[#7564ed]/15 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#46516b] mb-1.5" htmlFor="linkedin">
                      LinkedIn Profile / Portfolio URL <span className="text-xs text-[#8a96ad] font-normal">(Optional)</span>
                    </label>
                    <input
                      id="linkedin"
                      type="url"
                      placeholder="https://linkedin.com/in/yourprofile"
                      value={linkedInUrl}
                      onChange={(e) => setLinkedInUrl(e.target.value)}
                      className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3.5 py-2.5 text-sm outline-none focus:border-[#7564ed] focus:ring-3 focus:ring-[#7564ed]/15 transition"
                    />
                  </div>
                </div>
              </section>

              {/* Section 2: Academic & Professional Credentials */}
              <section className="rounded-3xl border border-[#e4e8f1] bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 border-b border-[#edf0f5] pb-4 mb-6">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#f0edff] text-[#7564ed] text-xs font-bold">
                    2
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-[#18223c]">Academic & Professional Background</h2>
                    <p className="text-xs text-[#73809b]">Your educational pedigree and professional track record</p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-[#46516b] mb-1.5" htmlFor="qualification">
                      Highest Qualification <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="qualification"
                      value={highestQualification}
                      onChange={(e) => setHighestQualification(e.target.value)}
                      className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3.5 py-2.5 text-sm outline-none focus:border-[#7564ed] focus:ring-3 focus:ring-[#7564ed]/15 transition"
                    >
                      {QUALIFICATIONS.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#46516b] mb-1.5" htmlFor="institute">
                      College / University or Institution <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="institute"
                      type="text"
                      required
                      placeholder="e.g. IIT Bombay / NIT Warangal / BITS Pilani"
                      value={institute}
                      onChange={(e) => setInstitute(e.target.value)}
                      className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3.5 py-2.5 text-sm outline-none focus:border-[#7564ed] focus:ring-3 focus:ring-[#7564ed]/15 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#46516b] mb-1.5" htmlFor="profession">
                      Current Profession or Designation <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="profession"
                      type="text"
                      required
                      placeholder="e.g. Senior Physics Faculty / Research Associate"
                      value={currentProfession}
                      onChange={(e) => setCurrentProfession(e.target.value)}
                      className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3.5 py-2.5 text-sm outline-none focus:border-[#7564ed] focus:ring-3 focus:ring-[#7564ed]/15 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#46516b] mb-1.5" htmlFor="experience">
                      Total Years of Teaching / Industry Experience <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="experience"
                      type="number"
                      min="0"
                      max="40"
                      required
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3.5 py-2.5 text-sm outline-none focus:border-[#7564ed] focus:ring-3 focus:ring-[#7564ed]/15 transition"
                    />
                  </div>
                </div>
              </section>

              {/* Section 3: Mentoring Specialization & Teaching Details */}
              <section className="rounded-3xl border border-[#e4e8f1] bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 border-b border-[#edf0f5] pb-4 mb-6">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#f0edff] text-[#7564ed] text-xs font-bold">
                    3
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-[#18223c]">Teaching Expertise & Pedagogy</h2>
                    <p className="text-xs text-[#73809b]">Select topics you are confident resolving in live 1-on-1 calls</p>
                  </div>
                </div>

                {/* Subject Selection */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-[#46516b] mb-2">
                    Areas of Expertise or Subjects You Can Teach <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {SUBJECT_OPTIONS.map((subj) => {
                      const selected = selectedSubjects.includes(subj);
                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => toggleSubject(subj)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                            selected
                              ? "bg-[#7564ed] text-white shadow-xs"
                              : "border border-[#dfe5ef] bg-[#fafbfe] text-[#46516c] hover:bg-[#f0edff]"
                          }`}
                        >
                          {selected && <CheckCircle2 size={13} />}
                          {subj}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom subject adder */}
                  <div className="flex gap-2 max-w-md">
                    <input
                      type="text"
                      placeholder="Add other specialization (e.g. Rotational Motion)..."
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3 py-1.5 text-xs outline-none focus:border-[#7564ed] w-full"
                    />
                    <button
                      type="button"
                      onClick={addCustomSubject}
                      className="rounded-xl border border-[#dfe5ef] bg-white px-3 py-1.5 text-xs font-bold text-[#46516c] hover:bg-[#f7f8fc] shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className="mb-6 max-w-xs">
                  <label className="block text-xs font-bold text-[#46516b] mb-1.5">
                    Available Hours / Week
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="60"
                    value={availabilityHours}
                    onChange={(e) => setAvailabilityHours(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] px-3.5 py-2.5 text-sm outline-none focus:border-[#7564ed]"
                  />
                </div>

                {/* Professional Bio (Optional) */}
                <div className="mb-5">
                  <label className="block text-xs font-bold text-[#46516b] mb-1.5" htmlFor="bio">
                    Short Professional Bio <span className="text-[11px] font-normal text-[#8a96ad]">(Optional)</span>
                  </label>
                  <textarea
                    id="bio"
                    rows={3}
                    placeholder="Brief summary shown to JEE students before they connect with you (e.g. B.Tech from IIT Madras with 4+ years coaching JEE Advanced rankers in Mechanics and Calculus)..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm outline-none focus:border-[#7564ed] focus:ring-3 focus:ring-[#7564ed]/15 transition"
                  />
                  <p className="text-[11px] text-[#8a96ad] text-right">
                    {bio.length > 0 ? `${bio.length} characters` : "Optional"}
                  </p>
                </div>

                {/* Teaching Experience (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-[#46516b] mb-1.5" htmlFor="teachingExp">
                    Detailed Teaching / Mentoring Experience <span className="text-[11px] font-normal text-[#8a96ad]">(Optional)</span>
                  </label>
                  <textarea
                    id="teachingExp"
                    rows={4}
                    placeholder="Describe your previous teaching experience, institutes taught at, student rank achievements, and how you explain complex concepts simply..."
                    value={teachingExperience}
                    onChange={(e) => setTeachingExperience(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm outline-none focus:border-[#7564ed] focus:ring-3 focus:ring-[#7564ed]/15 transition"
                  />
                  <p className="text-[11px] text-[#8a96ad] text-right">
                    {teachingExperience.length > 0 ? `${teachingExperience.length} characters` : "Optional"}
                  </p>
                </div>
              </section>

              {/* Section 4: Resume Upload & Verification */}
              <section className="rounded-3xl border border-[#e4e8f1] bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 border-b border-[#edf0f5] pb-4 mb-6">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#f0edff] text-[#7564ed] text-xs font-bold">
                    4
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-[#18223c]">Resume Upload & Verification</h2>
                    <p className="text-xs text-[#73809b]">Upload your CV/resume in PDF or Word format (max 5 MB)</p>
                  </div>
                </div>

                <div className="rounded-2xl border-2 border-dashed border-[#dcd8fb] bg-[#faf9ff] p-6 text-center hover:bg-[#f6f4ff] transition">
                  <input
                    type="file"
                    id="resume"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {resumeFile ? (
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 rounded-2xl bg-[#e4f8f5] text-[#247b70] grid place-items-center mb-3">
                        <FileText size={24} />
                      </div>
                      <p className="text-sm font-bold text-[#18223c] max-w-sm truncate">{resumeFile.name}</p>
                      <p className="text-xs text-[#73809b] mt-0.5">
                        {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB · {resumeFile.type || "Document"}
                      </p>
                      <button
                        type="button"
                        onClick={() => setResumeFile(null)}
                        className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#fecaca] bg-white px-3 py-1 text-xs font-bold text-[#dc2626] hover:bg-[#fff1f2]"
                      >
                        <X size={13} /> Change file
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="resume" className="cursor-pointer block">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#7564ed] shadow-xs mb-3">
                        <UploadCloud size={24} />
                      </div>
                      <p className="text-sm font-bold text-[#18223c]">
                        Click to upload or drag & drop your resume
                      </p>
                      <p className="text-xs text-[#73809b] mt-1">
                        PDF preferred (Word accepted), up to 5 MB
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1 rounded-xl bg-[#7564ed] px-4 py-2 text-xs font-bold text-white shadow-xs">
                        Browse Files
                      </span>
                    </label>
                  )}
                </div>

                <div className="mt-4 flex items-start gap-2.5 text-xs text-[#73809b]">
                  <ShieldCheck size={16} className="text-[#2c967b] shrink-0 mt-0.5" />
                  <span>
                    Your resume and contact information are strictly kept confidential and only accessible to authorized academic administrators during credential verification.
                  </span>
                </div>
              </section>

              {/* Submit CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <Link
                  href="/"
                  className="rounded-xl border border-[#dfe5ef] bg-white px-5 py-3 text-sm font-bold text-[#46516c] hover:bg-[#f7f8fc] transition"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7564ed] px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#6655df] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {busy ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Submitting Application…
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Submit Mentor Application
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

