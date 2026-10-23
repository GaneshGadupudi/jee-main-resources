"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StudyTask from "@/components/StudyTask";
import WeeklyChallenge from "@/components/WeeklyChallenge";
import MockTests from "@/components/MockTests";
import ThemeToggle, { applyTheme } from "@/components/ThemeToggle";
import { api } from "@/lib/client-api";
import { importLegacyStorage } from "@/lib/legacy-import";
import { getContests } from "@/lib/contest";
import NotificationBell from "@/components/NotificationBell";
import { dayKey, summarize, strengthMap, predictedScore, goalGap, dailyHeatmap } from "@/lib/progress";
import { buildPlan, daysUntil, planMode, todayKey, weightLabel, allChapters } from "@/lib/plan";
import { MARKS } from "@/lib/contest";
import { getMockTests } from "@/lib/mock";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import StudyCircle from "@/components/StudyCircle";
import AiTutor from "@/components/AiTutor";
import MentorRequestButton from "@/components/mentor/MentorRequestButton";
import RequestWrittenSolutionButton from "@/components/mentor/RequestWrittenSolutionButton";
import StudentWrittenSolutions from "@/components/student/StudentWrittenSolutions";
import {
  BookOpen, BrainCircuit, Check, ChevronRight, CircleHelp, Clock3,
  Flame, Home, LayoutDashboard, ListChecks, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Play, 
  BookMarked, PenTool, Sparkles, Target, Trophy, UserRound, Users, X, Zap,
} from "lucide-react";

const questions = [
  { subject: "Physics", chapter: "Kinematics", text: "A particle's velocity is v(t) = 3t² + 2 m/s. What is its acceleration at t = 2 s?", options: ["6 m/s²", "12 m/s²", "14 m/s²", "18 m/s²"], answer: 1, explanation: "Acceleration is dv/dt = 6t. At t = 2 s, a = 12 m/s²." },
  { subject: "Chemistry", chapter: "Atomic Structure", text: "How many electrons does a neutral sodium atom have in its outermost shell?", options: ["1", "2", "3", "8"], answer: 0, explanation: "Sodium's configuration is 2, 8, 1, so it has 1 electron in its outermost shell." },
  { subject: "Mathematics", chapter: "Differentiation", text: "What is the derivative of x³ with respect to x?", options: ["x²", "2x", "3x²", "3x"], answer: 2, explanation: "By the power rule, d/dx(xⁿ) = n·xⁿ⁻¹, so d/dx(x³) = 3x²." },
];

const navItems = [
  ["overview", "Overview", Home], ["study-plan", "Study plan", ListChecks],
  ["practice", "Daily practice", BrainCircuit], ["aiTutor", "AI Tutor", Sparkles], ["pyq", "PYQ practice", BookMarked], ["mock-tests", "Mock tests", Clock3],
  ["challenge", "Weekly challenge", Trophy], ["live-sessions", "Live sessions", CircleHelp],
  ["mentor-solutions", "Mentor Solutions", PenTool],
  ["mistakes", "Mistake book", BookOpen], ["study-circle", "Study circle", Users],
  ["progress", "Progress", LayoutDashboard], ["profile", "My profile", UserRound],
];

const mistakeReasons = ["Calculation mistake", "Concept not clear", "Read the question incorrectly", "Guess"];
const reasonLabels = { "Calculation mistake": "Calculation mistake", "Concept not clear": "Conceptual mistake", "Read the question incorrectly": "Misread question", Guess: "Guessed answer" };

const notes = {
  "Current Electricity": "Current electricity.pdf",
  Kinematics: "Kinematics.pdf",
  "Chemical Bonding": "Chemical bonding.pdf",
  "Atomic Structure": "Atomic structure.pdf",
  Differentiation: "diff.pdf",
  "Indefinite Integrals": "Indefinite integration.pdf",
};

function Button({ children, variant = "primary", className = "", ...props }) {
  const style = variant === "ghost"
    ? "border border-[#dfe3ef] bg-white text-[#34405b] hover:bg-[#f3f1ff]"
    : variant === "soft"
      ? "bg-[#f0edff] text-[#5e4bc1] hover:bg-[#e5e0ff]"
      : "bg-[#7564ed] text-white shadow-[0_8px_20px_rgba(117,100,237,.2)] hover:bg-[#6655df]";
  return <button className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${style} ${className}`} {...props}>{children}</button>;
}

function Card({ children, className = "" }) {
  return <section className={`rounded-2xl border border-[#e4e8f1] bg-white p-5 ${className}`}>{children}</section>;
}

function Metric({ icon: Icon, label, value, hint, tone }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-[#e4e8f1] bg-white p-4"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon size={18} /></span><span><small className="block text-xs font-semibold text-[#7b879e]">{label}</small><strong className="block text-xl text-[#202a45]">{value}</strong><small className="text-[11px] text-[#8994aa]">{hint}</small></span></div>;
}

function DashboardApp() {
  const [view, setView] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [completed, setCompleted] = useState([]);
  const [mistakes, setMistakes] = useState([]);
  const [registered, setRegistered] = useState(false);
  const [mentorRequested, setMentorRequested] = useState(false);
  const [profile, setProfile] = useState({
    name: "Ganesh",
    email: "gadupudiganesh@gmail.com",
    target: "JEE Main",
    date: "2026-12-06",
    hours: "4 hours",
    stage: "Class 12",
    exams: ["JEE Main", "JEE Advanced"],
    strengths: ["Physics", "Chemistry"],
    focus: ["Mathematics"],
    goal: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswer, setPracticeAnswer] = useState(null);
  const [mistakeReason, setMistakeReason] = useState("");
  const [mistakeReasonOpen, setMistakeReasonOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [planTasks, setPlanTasks] = useState([]);
  const [chapterHistory, setChapterHistory] = useState([]);
  const [scores, setScores] = useState({});
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [doneLog, setDoneLog] = useState([]);
  const [timeLog, setTimeLog] = useState([]);
  const [pyqSubject, setPyqSubject] = useState("all");
  const [pyqChapter, setPyqChapter] = useState("all");
  const [pyqTopic, setPyqTopic] = useState("all");
  const [pyqTaxonomy, setPyqTaxonomy] = useState([]);
  const [pyqData, setPyqData] = useState({ questions: [], total: 0, loading: true, error: "" });
  useEffect(() => { fetch("/api/pyq/taxonomy").then((r) => r.json()).then((d) => setPyqTaxonomy(d.subjects || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (view !== "pyq") return;
    let active = true;
    const params = new URLSearchParams();
    if (pyqSubject !== "all") params.set("subject", pyqSubject);
    if (pyqChapter !== "all") params.set("chapter", pyqChapter);
    if (pyqTopic !== "all") params.set("topic", pyqTopic);
    setPyqData((current) => ({ ...current, loading: true, error: "" }));
    fetch(`/api/pyq/questions?${params}`).then((r) => r.json().then((d) => ({ ok: r.ok, d }))).then(({ ok, d }) => {
      if (active) setPyqData(ok ? { questions: d.questions, total: d.total, loading: false, error: "" } : { questions: [], total: 0, loading: false, error: d.error || "Unable to load questions." });
    }).catch(() => { if (active) setPyqData({ questions: [], total: 0, loading: false, error: "Unable to load questions." }); });
    return () => { active = false; };
  }, [view, pyqSubject, pyqChapter, pyqTopic]);

  const contestKey = useMemo(() => getContests(new Date()).upcoming.id, []);
  const [serverPlan, setServerPlan] = useState(null);
  const [histories, setHistories] = useState({ contest: [], mock: [] });
  const [activeTests, setActiveTests] = useState({ contest: null, mock: null });
  const [notificationReads, setNotificationReads] = useState({});
  const [groupInvites, setGroupInvites] = useState([]);
  const [mentorInfo, setMentorInfo] = useState(null);
  const [writtenSolutions, setWrittenSolutions] = useState([]);
  const [weeklySummaryStatus, setWeeklySummaryStatus] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const authResponse = await fetch("/api/auth/session");
        const authData = await authResponse.json();
        if (!active) return;
        const user = authData.user;
        const preferencesResponse = await fetch("/api/preferences");
        const preferencesData = preferencesResponse.ok ? await preferencesResponse.json() : {};
        const saved = preferencesData.preferences;
        setProfile((current) => ({
          ...current,
          name: user?.name || user?.email?.split("@")[0] || "Student",
          email: user?.email || "",
          ...(saved || {}),
        }));
        if (user) {
          await importLegacyStorage(contestKey); // one-time move of anything an older version kept in this browser
          const stateResponse = await fetch(`/api/me/state?today=${todayKey()}&contest=${contestKey}`);
          if (stateResponse.ok && active) {
            const state = await stateResponse.json();
            setCompleted(state.completed);
            setMistakes(state.mistakes);
            setRegistered(state.registered);
            setChapterHistory(state.chapterHistory);
            setScores(state.scores);
            setAnswers(state.answers);
            setDoneLog(state.doneLog);
            setTimeLog(state.timeLog);
            setServerPlan(state.plan);
            setHistories(state.histories);
            setActiveTests(state.active);
            setNotificationReads(state.notificationReads);
            setMentorInfo(state.mentor);
            setMentorRequested(!!state.mentor && state.mentor.status !== "Closed");
            fetch("/api/me/written-solutions").then((r) => (r.ok ? r.json() : null)).then((d) => {
              if (active && d?.requests) setWrittenSolutions(d.requests);
            }).catch(() => {});
            const shown = document.documentElement.dataset.theme;
            if (state.theme && state.theme !== shown) applyTheme(state.theme);
            else if (!state.theme && shown === "dark") api("PUT", "/api/me/settings", { theme: "dark" }); // first time on accounts: keep the student's current choice
          }
        }
      } catch { /* the dashboard still opens, with empty data, if loading fails */ }
      if (active) setLoaded(true);
    }
    loadDashboard();
    return () => { active = false; };
  }, []);

  // Group invitations arrive from other students, so check for new ones every minute and whenever the tab is shown again.
  useEffect(() => {
    let active = true;
    const check = () => fetch("/api/me/circle?invites=1").then((r) => (r.ok ? r.json() : null)).then((data) => { if (active && data?.invites) setGroupInvites(data.invites); }).catch(() => {});
    check();
    const timer = setInterval(check, 60000);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  const go = (next) => { setView(next); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const logOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };
  const markDone = (id) => { const today = dayKey(); if (!doneLog.some((entry) => entry.d === today && entry.id === id)) setDoneLog([...doneLog, { d: today, id, m: planTasks.find((task) => task.id === id)?.minutes || 0 }]); };
  const toggleTask = (id) => {
    const finishing = !completed.includes(id);
    setCompleted(finishing ? [...completed, id] : completed.filter((item) => item !== id));
    api("PATCH", "/api/me/plan", { date: todayKey(), taskKey: id, completed: finishing });
    if (finishing) markDone(id); else setDoneLog(doneLog.filter((entry) => !(entry.d === dayKey() && entry.id === id)));
  };
  const logAnswers = (list) => { setAnswers([...answers, ...list].slice(-3000)); api("POST", "/api/me/practice", { answers: list }); };
  const logTest = ({ questions: paper, answers: given, timeTaken, source }) => {
    logAnswers(paper.flatMap((question, index) => given[index] === null ? [] : [{ d: dayKey(), src: source, s: question.subject, c: question.chapter, q: question.text, ok: given[index] === question.answer }]));
    setTimeLog([...timeLog, { d: dayKey(), m: Math.max(1, Math.round(timeTaken / 60000)) }]); // the server works out the same figure from the submitted attempt
  };
  const setMistakeReasonFor = (text, reason) => { setMistakes(mistakes.map((item) => item.text === text ? { ...item, reason } : item)); api("PATCH", "/api/me/mistakes", { text, reason }); };
  const toggleRevisited = (text) => { const revisited = !mistakes.find((item) => item.text === text)?.revisited; setMistakes(mistakes.map((item) => item.text === text ? { ...item, revisited } : item)); api("PATCH", "/api/me/mistakes", { text, revisited }); };
  const removeMistake = (text) => { setMistakes(mistakes.filter((item) => item.text !== text)); api("DELETE", `/api/me/mistakes?text=${encodeURIComponent(text)}`); };
  const addMistakes = (list) => { const fresh = list.filter((question) => !mistakes.some((item) => item.text === question.text)); if (fresh.length) { setMistakes([...mistakes, ...fresh]); api("POST", "/api/me/mistakes", { items: fresh }); } };
  const addMistake = (question) => addMistakes([question]);
  const markNotificationsRead = (reads) => { setNotificationReads((current) => ({ ...current, ...Object.fromEntries(reads.map(({ id, readAt }) => [id, { readAt }])) })); api("PUT", "/api/me/notifications", { reads }); };
  const sendWeeklySummary = async () => {
    if (!profile.email) { setWeeklySummaryStatus("error"); return; }
    setWeeklySummaryStatus("sending");
    const response = await fetch("/api/me/weekly-summary", { method: "POST" });
    setWeeklySummaryStatus(response.ok ? "sent" : "error");
  };
  const requestMentor = async () => {
    setMentorRequested(true);
    const response = await api("POST", "/api/me/mentor-requests", { context: currentQuestion?.text });
    if (response?.ok) setMentorInfo(await response.json());
  };
  const finishTask = (task, result) => {
    if (!completed.includes(task.id)) setCompleted([...completed, task.id]);
    markDone(task.id);
    if (task.chapterId && !chapterHistory.includes(task.chapterId)) setChapterHistory([...chapterHistory, task.chapterId]);
    setScores({ ...scores, [task.id]: result });
    api("PATCH", "/api/me/plan", { date: todayKey(), taskKey: task.id, completed: true, score: result, chapterKey: task.chapterId });
    setActiveTaskId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const currentQuestion = questions[practiceIndex];
  const viewLabel = navItems.find(([id]) => id === view)?.[1] || "Dashboard";
  const examDays = Math.max(0, Math.ceil((new Date(`${profile.date}T00:00:00`) - new Date()) / 86400000));
  const examDateLabel = new Date(`${profile.date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const planSignature = [profile.date, profile.hours, profile.focus.join(), profile.strengths.join()].join("|");
  // Build today's plan once per day (or when the exam date / hours / subject preferences change), then keep it stable.
  useEffect(() => {
    if (!loaded) return;
    const today = todayKey();
    const saved = serverPlan;
    if (saved && saved.date === today && saved.signature === planSignature) { setPlanTasks(saved.tasks); return; }
    const sameDay = saved && saved.date === today;
    const keep = sameDay ? saved.tasks.filter((task) => task.type === "chapter" && completed.includes(task.id)) : [];
    const tasks = buildPlan({ profile, daysLeft: daysUntil(profile.date), doneChapters: chapterHistory, keep });
    const plan = { date: today, signature: planSignature, tasks };
    api("PUT", "/api/me/plan", plan); // tasks that stay in the plan keep their completion on the server
    setServerPlan(plan);
    setPlanTasks(tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, planSignature]);
  const planDone = planTasks.filter((task) => completed.includes(task.id)).length;
  const planTotal = planTasks.length || 1;
  const mode = planMode(examDays);
  const stats = summarize({ answers, done: doneLog, timeLog, mockHistory: histories.mock, hoursPerDay: profile.hours, dailySetSize: questions.length });

  const mockPapers = getMockTests();
  const maxScore = mockPapers[0]?.questions.length * MARKS.correct || 60;
  const strength = strengthMap({ answers, chapters: allChapters });
  const prediction = predictedScore({ mocks: histories.mock, maxScore });
  const goal = goalGap({ targetPercentile: profile.goalPercentile, recentAvgPct: prediction.available ? (prediction.avg / maxScore) * 100 : null, maxScore });
  const heatmap = dailyHeatmap({ answers, done: doneLog, timeLog });
  const weekHours = (stats.weekMinutes / 60).toFixed(1);

  // ---------------- Month-by-month consistency calendar (for profile section) ----------------
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Build month groups for the last 12 months
  const endDate = new Date();
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1);

  const monthGroups = [];
  let cursor = new Date(startDate);
  while (cursor <= endDate) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
    const totalCells = startOffset + lastDay.getDate();

    // Map heatmap cells by date string for quick lookup
    const dayMap = {};
    for (const cell of heatmap) {
      dayMap[cell.date] = cell;
    }

    const weeks = [];
    for (let weekStart = 0; weekStart < totalCells; weekStart += 7) {
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const cellIndex = weekStart + i;
        if (cellIndex < startOffset || cellIndex >= startOffset + lastDay.getDate()) {
          weekDays.push(null); // padding outside this month
        } else {
          const dayOfMonth = cellIndex - startOffset + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`;
          const cell = dayMap[dateStr] || { date: dateStr, count: 0, correct: 0, accuracy: null, level: 0 };
          weekDays.push(cell);
        }
      }
      weeks.push(weekDays);
    }

    monthGroups.push({
      key: `${year}-${month}`,
      label: `${MONTH_NAMES[month]} ${year}`,
      weeks,
    });

    cursor = new Date(year, month + 1, 1);
  }

  const weekTargetHours = Math.round(stats.weekTarget / 60);
  const weekPercent = Math.min(100, Math.round((stats.weekMinutes / stats.weekTarget) * 100));
  const todayLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const choosePracticeAnswer = (index) => {
    if (practiceAnswer !== null) return;
    setPracticeAnswer(index);
    logAnswers([{ d: dayKey(), src: "daily", s: currentQuestion.subject, c: currentQuestion.chapter, q: currentQuestion.text, ok: index === currentQuestion.answer }]);
    if (index !== currentQuestion.answer && !mistakes.some((item) => item.text === currentQuestion.text)) {
      addMistake({ ...currentQuestion, reason: "" });
    }
  };
  const nextPracticeQuestion = () => {
    if (practiceIndex < questions.length - 1) {
      setPracticeIndex((index) => index + 1);
      setPracticeAnswer(null);
      setMistakeReason("");
      setMistakeReasonOpen(false);
    }
  };
  const selectedPyqSubject = pyqTaxonomy.find((subject) => String(subject.id) === pyqSubject);
  const pyqChapters = selectedPyqSubject?.chapters || pyqTaxonomy.flatMap((subject) => subject.chapters);
  const pyqTopics = pyqChapters.filter((chapter) => pyqChapter === "all" || String(chapter.id) === pyqChapter).flatMap((chapter) => chapter.topics);
  const filteredPyqs = pyqData.questions;
  const overview = <div className="space-y-4"><section className="flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-2xl border border-[#dcd8fb] bg-gradient-to-r from-[#f1efff] to-[#fbfbff] p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7e1ff] text-[#7564ed]"><Clock3 size={18} /></span><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">YOUR NEXT EXAM</p><h2 className="mt-1 text-sm font-extrabold text-[#27314c]">{profile.target}</h2><p className="mt-1 text-[10px] text-[#7d879e]">Your {profile.target} target date is {examDateLabel}.</p></div></div><div className="flex items-center gap-3"><div className="text-right"><strong className="block text-3xl font-extrabold text-[#282354]">{examDays}</strong><span className="text-[10px] text-[#7d879e]">days to go</span></div><button onClick={() => go("profile")} className="grid h-8 w-8 place-items-center rounded-lg border border-[#dcd8fb] bg-white text-[#7564ed]" aria-label="Edit exam date"><ChevronRight size={15} /></button></div></section><div className="grid gap-4 lg:grid-cols-[1.35fr_.9fr]"><Card><div className="flex items-start justify-between"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">BUILD YOUR RHYTHM</p><h2 className="mt-1 text-sm font-extrabold text-[#27314c]">Daily consistency</h2></div><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f0edff] text-[#7564ed]"><Flame size={15} /></span></div><div className="mt-4 flex items-end gap-2"><strong className="text-2xl text-[#202944]">{stats.streak}</strong><span className="mb-1 text-[10px] text-[#7d879e]">day streak</span></div><p className="mt-2 text-[10px] leading-5 text-[#7d879e]">Show up for one focused session today. Small steps compound.</p><div className="mt-4 flex justify-between text-[9px] font-bold text-[#9aa3b5]">{stats.week.map((day) => <span key={day.key} title={day.key} className={`grid h-6 w-6 place-items-center rounded-full ${day.active ? "bg-[#7564ed] text-white" : "bg-[#f1f3f7]"} ${day.today ? "ring-1 ring-[#b9adff] ring-offset-1" : ""}`}>{day.label}</span>)}</div></Card><Card><div className="flex items-start justify-between"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">THIS WEEK</p><h2 className="mt-1 text-sm font-extrabold text-[#27314c]">Weekly target</h2></div><button onClick={() => go("progress")} className="text-[10px] font-bold text-[#7564ed]">Details →</button></div><div className="mt-4 flex items-end gap-1"><strong className="text-2xl text-[#202944]">{weekHours}</strong><span className="mb-1 text-[10px] text-[#7d879e]">/ {weekTargetHours} hrs</span><span className="mb-1 ml-auto text-[9px] font-bold text-[#7564ed]">{weekPercent}%</span></div><div className="mt-3 h-1.5 rounded-full bg-[#edf0f6]"><div className="h-full rounded-full bg-[#7564ed]" style={{ width: `${weekPercent}%` }} /></div><p className="mt-3 text-[10px] text-[#7d879e]">Study tasks and practice keep your target moving.</p></Card></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Check} label="Plan completed" value={`${Math.round((planDone / planTotal) * 100)}%`} hint={`${planDone} of ${planTotal} tasks`} tone="bg-[#eeeaff] text-[#6855d0]" /><Metric icon={BrainCircuit} label="Questions today" value={stats.todayCount} hint="Start your daily practice" tone="bg-[#e4f8f5] text-[#278f82]" /><Metric icon={Flame} label="Study streak" value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`} hint="One day at a time" tone="bg-[#fff3dc] text-[#b67821]" /><Metric icon={BookOpen} label="Mistakes to revisit" value={mistakes.length} hint="Your personal revision list" tone="bg-[#ffe8eb] text-[#c7586d]" /></div><div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]"><Card><div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">YOUR PERSONAL PLAN</p><h2 className="mt-1 text-sm font-extrabold text-[#27314c]">Today&apos;s study plan</h2></div><button onClick={() => go("study-plan")} className="text-[10px] font-extrabold text-[#6958d2]">See all →</button></div><div className="mt-4 space-y-1">{planTasks.slice(0, 4).map((task) => <button key={task.id} onClick={() => go("study-plan")} className="flex w-full items-center gap-3 border-b border-[#edf0f5] py-3 text-left last:border-0"><span className={`grid h-5 w-5 place-items-center rounded-md border text-[10px] ${completed.includes(task.id) ? "border-[#9ad7c9] bg-[#ddf6ed] text-[#2c967b]" : "border-[#cdd4e2] bg-white text-transparent"}`}><Check size={12} /></span><span className={`flex-1 text-xs font-bold ${completed.includes(task.id) ? "text-[#8d96a8] line-through" : "text-[#46516c]"}`}>{task.title}<small className="mt-1 block text-[9px] font-normal text-[#9aa3b5]">{task.type === "chapter" ? `${task.subject} · ${task.chapter}` : task.type === "mistakes" ? "Revision · Mistake book review" : "Study routine · Daily commitment"}</small></span><span className="text-[9px] text-[#8994aa]">{task.minutes} min</span></button>)}</div><div className="mt-3 h-1.5 rounded-full bg-[#edf0f6]"><div className="h-full rounded-full bg-[#7564ed]" style={{ width: `${Math.round((planDone / planTotal) * 100)}%` }} /></div><p className="mt-2 text-right text-[9px] text-[#8994aa]">{planDone} of {planTotal} complete</p></Card><Card className="border-[#dcd8fb] bg-gradient-to-br from-[#f4f1ff] to-white"><div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8175bd]">DAILY PRACTICE</p><h2 className="mt-1 text-sm font-extrabold text-[#29274e]">Problems of the day</h2></div><span className="text-[9px] font-extrabold text-[#4bbd99]">TODAY</span></div><p className="mt-4 text-xs leading-5 text-[#707b94]">A focused set across Physics, Chemistry and Mathematics, with explanations to learn from every answer.</p><div className="mt-4 flex flex-wrap gap-2 text-[10px]"><span className="rounded-lg border border-[#dce8f6] bg-white px-2 py-1 text-[#5f82ac]">Physics 5</span><span className="rounded-lg border border-[#eadff8] bg-white px-2 py-1 text-[#8465b6]">Chemistry 5</span><span className="rounded-lg border border-[#f0e4c9] bg-white px-2 py-1 text-[#b0833b]">Maths 5</span></div><p className="mt-4 text-[9px] text-[#8994aa]">15 questions · About 25 min</p><Button className="mt-4 w-full" onClick={() => go("practice")}>Start daily practice <ChevronRight size={14} /></Button></Card></div><div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]"><Card><div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">WEEKLY CHALLENGE</p><h2 className="mt-1 text-sm font-extrabold text-[#27314c]">Your weekend checkpoint</h2></div><Trophy size={16} className="text-[#d29a3a]" /></div><p className="mt-3 text-[10px] leading-5 text-[#7d879e]">A common, timed challenge for participating students. Your score, rank and percentile appear here after a challenge opens.</p><div className="mt-3 rounded-xl border border-[#e4e8f1] bg-[#fafbfe] p-3 text-[10px] text-[#69758d]"><div className="flex justify-between py-1"><span>Physics</span><b>25</b></div><div className="flex justify-between py-1"><span>Chemistry</span><b>25</b></div><div className="flex justify-between py-1"><span>Maths</span><b>25</b></div><div className="mt-1 flex justify-between border-t border-[#e4e8f1] pt-2"><span>Total</span><b>75 questions</b></div></div><button onClick={() => go("challenge")} className="mt-3 w-full rounded-xl border border-[#dfe3ef] px-3 py-2 text-[10px] font-extrabold text-[#34405b]">Explore challenge →</button></Card><Card><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">YOUR NEXT STEP</p><h2 className="mt-1 text-sm font-extrabold text-[#27314c]">Keep your momentum</h2><p className="mt-4 text-sm font-bold text-[#46516c]">&quot;Consistent beats long, random hours.&quot;</p><p className="mt-3 text-[10px] leading-5 text-[#7d879e]">Complete a study task or try today&apos;s practice to start building a picture of your progress.</p><button onClick={() => go("progress")} className="mt-4 text-[10px] font-extrabold text-[#6958d2]">View my progress →</button></Card></div><Card className="flex flex-wrap items-center justify-between gap-4 border-[#dcd8fb] bg-gradient-to-r from-[#f4f1ff] to-white"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8175bd]">YOUR ON-DEMAND COMPANION</p><h2 className="mt-1 text-sm font-extrabold text-[#29274e]">A little help goes a long way</h2></div><div className="flex items-center gap-3"><Button onClick={() => go("practice")}>Open AI tutor →</Button><button onClick={() => go("practice")} className="text-[10px] font-bold text-[#7564ed]">Connect with a mentor</button></div></Card></div>;

  const activePlanTask = planTasks.find((task) => task.id === activeTaskId);
  const taskMeta = (task) => task.type === "chapter" ? `${task.subject} · ${weightLabel(task.weight)} · ${task.minutes} min` : task.type === "mistakes" ? `Revision · Mistake-book review · ${task.minutes} min` : `Study routine · Your daily commitment · ${task.minutes} min`;
  const plan = activePlanTask
    ? <StudyTask key={activePlanTask.id} task={activePlanTask} nextTitle={planTasks[planTasks.indexOf(activePlanTask) + 1]?.title} onBack={() => setActiveTaskId(null)} onAnswer={(a) => logAnswers([{ d: dayKey(), src: "plan", s: a.subject, c: a.chapter, q: a.text, ok: a.correct }])} onWrong={addMistake} onReason={setMistakeReasonFor} onComplete={(result) => finishTask(activePlanTask, result)} />
    : <div className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">PLAN YOUR PREPARATION</p><h1 className="text-3xl font-extrabold text-[#18223c]">Today&apos;s study plan</h1><p className="mt-2 text-sm text-[#73809b]">A clear, manageable next step, planned around your {profile.hours} available study hours.</p></div><span className="text-xs text-[#8994aa]">{todayLabel}</span></div><Card className="border-[#dcd8fb] bg-gradient-to-r from-[#f4f1ff] to-white"><p className="text-sm text-[#59647d]"><strong>{examDays} days to your exam · {mode.label}.</strong> {mode.note}</p></Card><Card><div className="mb-4 flex justify-between"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">DAILY TASKS</p><h2 className="mt-1 text-lg font-extrabold text-[#27314c]">Focus for today</h2></div><span className="text-xs text-[#8994aa]">{planTasks.length} tasks</span></div>{planTasks.map((task, index) => { const unlocked = index === 0 || completed.includes(planTasks[index - 1].id); const done = completed.includes(task.id); const score = scores[task.id]; return <div key={task.id} className="flex flex-wrap items-center gap-x-3 gap-y-3 border-t border-[#edf0f5] py-4">{task.type === "chapter" ? <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${done ? "border-[#9ad7c9] bg-[#ddf6ed] text-[#2c967b]" : "border-[#cdd4e2] bg-white text-transparent"}`}><Check size={12} /></span> : <input type="checkbox" checked={done} disabled={!unlocked} onChange={() => toggleTask(task.id)} className="mt-1 h-5 w-5 shrink-0 accent-[#7564ed] disabled:opacity-50" aria-label={`${done ? "Complete" : "Not started"}: ${task.title}`} />}<span className={`min-w-0 flex-1 basis-[calc(100%-2rem)] text-sm font-bold sm:basis-0 ${done ? "text-[#2c967b] line-through" : "text-[#46516c]"}`}>{task.title}<small className="mt-1 block break-words text-[10px] font-normal leading-4 text-[#8994aa]">{taskMeta(task)}</small></span><div className="flex w-full items-center justify-between gap-3 pl-8 sm:w-auto sm:pl-0"><span className={`text-[10px] leading-4 sm:w-44 sm:text-right ${unlocked ? "text-[#8994aa]" : "text-[#aeb5c2]"}`}>{done ? (score?.total ? `Completed · ${score.correct}/${score.total} correct` : "Completed") : unlocked ? "Not started" : "Complete previous task to unlock"}</span><span className="flex w-28 shrink-0 justify-end">{task.type === "chapter" && <button disabled={!unlocked} onClick={() => setActiveTaskId(task.id)} className="w-24 rounded-lg bg-[#f0edff] px-3 py-2 text-center text-xs font-extrabold text-[#5e4bc1] hover:bg-[#e5e0ff] disabled:cursor-not-allowed disabled:opacity-40">{done ? "Review" : "Start"}</button>}{task.type === "mistakes" && unlocked && <button onClick={() => go("mistakes")} className="w-24 rounded-lg bg-[#f0edff] px-3 py-2 text-center text-xs font-extrabold text-[#5e4bc1] hover:bg-[#e5e0ff]">Open book</button>}</span></div></div>; })}<div className="mt-3 h-1.5 rounded-full bg-[#edf0f6]"><div className="h-full rounded-full bg-[#7564ed]" style={{ width: `${Math.round((planDone / planTotal) * 100)}%` }} /></div><p className="mt-2 text-right text-[10px] text-[#8994aa]">{planDone} of {planTotal} complete</p></Card><Card className="max-w-2xl border-[#dcd8fb] bg-gradient-to-r from-[#f4f1ff] to-white"><p className="text-sm text-[#59647d]"><strong>Make the plan yours.</strong> Your exam date, available hours and strong or weak subjects help shape what you work on next.</p><button onClick={() => go("profile")} className="mt-3 text-xs font-extrabold text-[#6958d2]">Edit preferences →</button></Card></div>;

  const aiTutorBlock = (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">INTERACTIVE DOUBT ASSISTANT</p>
        <h1 className="text-3xl font-extrabold text-[#18223c]">AI Tutor</h1>
        <p className="mt-2 text-sm text-[#73809b]">Ask questions, get step-by-step concept walkthroughs, or request 1-on-1 video mentorship.</p>
      </div>
      <Card className="max-w-3xl bg-gradient-to-b from-[#f4f1ff] to-white">
        <AiTutor
          key={currentQuestion.text}
          answered={practiceAnswer !== null}
          context={{
            subject: currentQuestion?.subject,
            chapter: currentQuestion?.chapter,
            text: currentQuestion?.text,
            options: currentQuestion?.options,
            answer: practiceAnswer !== null ? currentQuestion?.answer : undefined,
          }}
        >
          <div className="mt-5 border-t border-[#e6e1f7] pt-4">
            <p className="text-xs font-bold text-[#59647d] mb-2">Still unclear? Connect with a mentor</p>
            <MentorRequestButton
              question={currentQuestion?.text || ""}
              subject={currentQuestion?.subject || ""}
              chapter={currentQuestion?.chapter || ""}
            />
            <RequestWrittenSolutionButton
              question={currentQuestion?.text || ""}
              subject={currentQuestion?.subject || ""}
              chapter={currentQuestion?.chapter || ""}
              options={currentQuestion?.options || []}
              writtenSolutions={writtenSolutions}
              onSolutionRequested={(newReq) => setWrittenSolutions((prev) => [newReq, ...prev])}
              onViewSolutions={() => go("mentor-solutions")}
            />
          </div>
        </AiTutor>
      </Card>
    </div>
  );
  const practice = <div className="space-y-5"><div><p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">BUILD YOUR DAILY HABIT</p><h1 className="text-3xl font-extrabold text-[#18223c]">Daily practice</h1><p className="mt-2 text-sm text-[#73809b]">Answer, understand your mistake, and keep your revision list current.</p></div><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]"><Card><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-extrabold text-[#7564ed]">{currentQuestion.subject.toUpperCase()}</span><span className="text-xs text-[#8994aa]">Question {practiceIndex + 1} of {questions.length}</span></div><p className="mt-4 text-xs font-bold text-[#7564ed]">{currentQuestion.chapter}</p><h2 className="mt-3 text-xl font-extrabold leading-8 text-[#25304b]">{currentQuestion.text}</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{currentQuestion.options.map((option, index) => <button key={option} onClick={() => choosePracticeAnswer(index)} className={`min-h-14 rounded-xl border p-4 text-left text-sm font-semibold leading-6 transition ${practiceAnswer === index ? "border-[#8273df] bg-[#f1efff]" : "border-[#e4e8f1] bg-[#fafbfe] hover:border-[#bcb2f0]"}`}>{String.fromCharCode(65 + index)}. {option}</button>)}</div>{practiceAnswer !== null && <div className={`mt-5 rounded-xl p-4 text-sm leading-6 ${practiceAnswer === currentQuestion.answer ? "bg-[#e4f8f5] text-[#247b70]" : "bg-[#fff1f1] text-[#a34e5c]"}`}>{practiceAnswer === currentQuestion.answer ? "Correct! Great work." : <><div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center"><span className="min-w-0 break-words">Added to your mistake book. Tell us what went wrong so we can target it.</span><div className="relative w-full min-w-0 sm:w-auto sm:max-w-[15rem]"><button type="button" aria-expanded={mistakeReasonOpen} onClick={() => setMistakeReasonOpen((open) => !open)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#efc3c3] bg-white p-2 text-left text-xs text-[#59647d]"><span className="min-w-0 truncate">{mistakeReason || "Why was it wrong?"}</span><ChevronRight size={14} className={`shrink-0 transition-transform ${mistakeReasonOpen ? "rotate-90" : ""}`} /></button>{mistakeReasonOpen && <div role="listbox" className="mt-1 w-full overflow-hidden rounded-lg border border-[#efc3c3] bg-white shadow-lg">{mistakeReasons.map((reason) => <button key={reason} type="button" role="option" aria-selected={mistakeReason === reason} onClick={() => { setMistakeReason(reason); setMistakeReasonOpen(false); setMistakeReasonFor(currentQuestion.text, reason); }} className="block w-full px-3 py-2 text-left text-xs text-[#59647d] hover:bg-[#f5f2ff]">{reason}</button>)}</div>}</div></div></>}</div>}<div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f5] pt-5"><span className="text-xs text-[#8994aa]">{practiceAnswer === null ? "Choose an answer to continue" : practiceAnswer === currentQuestion.answer ? "Answer checked" : "Tell us why it was wrong to continue"}</span><Button disabled={practiceAnswer === null || practiceIndex === questions.length - 1 || (practiceAnswer !== currentQuestion.answer && !mistakeReason)} onClick={nextPracticeQuestion} className="w-full sm:w-auto">{practiceIndex === questions.length - 1 ? "Practice complete" : "Next question"} <ChevronRight size={16} /></Button></div></Card><Card className="h-fit bg-gradient-to-b from-[#f4f1ff] to-white"><AiTutor key={currentQuestion.text} answered={practiceAnswer !== null} context={{ subject: currentQuestion.subject, chapter: currentQuestion.chapter, text: currentQuestion.text, options: currentQuestion.options, answer: practiceAnswer !== null ? currentQuestion.answer : undefined }}><div className="mt-4 border-t border-[#e6e1f7] pt-4"><p className="text-xs font-bold text-[#59647d] mb-2">Still unclear?</p><MentorRequestButton question={currentQuestion?.text || ""} subject={currentQuestion?.subject || ""} chapter={currentQuestion?.chapter || ""} /><RequestWrittenSolutionButton question={currentQuestion?.text || ""} subject={currentQuestion?.subject || ""} chapter={currentQuestion?.chapter || ""} options={currentQuestion?.options || []} writtenSolutions={writtenSolutions} onSolutionRequested={(newReq) => setWrittenSolutions((prev) => [newReq, ...prev])} onViewSolutions={() => go("mentor-solutions")} /></div></AiTutor></Card></div></div>;

  const mockTests = <MockTests daysLeft={examDays} ready={loaded} history={histories.mock} activeSession={activeTests.mock} onHistory={(next) => setHistories((current) => ({ ...current, mock: next }))} onActive={(next) => setActiveTests((current) => ({ ...current, mock: next }))} onAddMistakes={addMistakes} onFinish={logTest} onReason={setMistakeReasonFor} onExit={() => go("overview")} />;


  const challenge = <WeeklyChallenge ready={loaded} history={histories.contest} activeSession={activeTests.contest} onHistory={(next) => setHistories((current) => ({ ...current, contest: next }))} onActive={(next) => setActiveTests((current) => ({ ...current, contest: next }))} onFinish={logTest} registered={registered} setRegistered={(value) => { setRegistered(value); api("PUT", "/api/me/contest-registration", { contestKey, registered: value }); }} onAddMistakes={addMistakes} onReason={setMistakeReasonFor} onExit={() => go("overview")} />;

  const progress = <div className="space-y-5">
    <div><p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">YOUR PREPARATION, OVER TIME</p><h1 className="text-3xl font-extrabold text-[#18223c]">Progress &amp; insights</h1><p className="mt-2 text-sm text-[#73809b]">A useful picture built from your real practice, tests and study-task activity.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Metric icon={BrainCircuit} label="Questions answered" value={stats.total} hint={`${stats.todayCount} today`} tone="bg-[#e4f8f5] text-[#278f82]" />
      <Metric icon={Target} label="Practice accuracy" value={stats.accuracy === null ? "–" : `${stats.accuracy}%`} hint={stats.total ? `${stats.correct} of ${stats.total} correct` : "Answer a question to see this"} tone="bg-[#eeeaff] text-[#6855d0]" />
      <Metric icon={Check} label="Study tasks done" value={stats.tasksDone} hint="All time" tone="bg-[#fff3dc] text-[#b67821]" />
      <Metric icon={Flame} label="Study streak" value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`} hint="Days in a row with activity" tone="bg-[#ffe8eb] text-[#c7586d]" />
      <Metric icon={Clock3} label="Study time this week" value={`${weekHours} hrs`} hint={`Target ${weekTargetHours} hrs`} tone="bg-[#e8f0ff] text-[#4c74c7]" />
    </div>
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold tracking-[.16em] text-[#8993ac]">STRENGTH MAP</p>
          <h2 className="mt-1 text-lg font-extrabold text-[#27314c]">Strong and weak areas</h2>
          <p className="mt-1 text-sm text-[#73809b]">Each chapter is coloured by your practice accuracy — green is strong, amber is moderate, red is weak, grey is not attempted yet.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#46516c] sm:shrink-0 sm:justify-end">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#4bbd99]"></span> Strong</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#fcd34d]"></span> Moderate</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#e0788a]"></span> Weak</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#f1f3f8] border border-[#dfe3ef]"></span> Not attempted</span>
        </div>
      </div>
      <div className="mt-4 space-y-4">
        {strength.subjects.map((subject) => (
          <div key={subject.subject}>
            <div className="flex justify-between gap-x-3 text-sm mb-2">
              <span className="font-bold text-[#46516c]">{subject.subject}</span>
              <span className="text-xs text-[#73809b]">{subject.total ? `${Math.round((subject.correct / subject.total) * 100)}% · ${subject.correct}/${subject.total}` : "No answers yet"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {strength.chapters.filter((chapter) => chapter.subject === subject.subject).map((chapter) => {
                const fill = chapter.strength === "strong" ? "bg-[#4bbd99]" : chapter.strength === "moderate" ? "bg-[#fcd34d]" : chapter.strength === "weak" ? "bg-[#e0788a]" : "bg-[#f1f3f8]";
                return (
                  <div key={chapter.id} className="rounded-lg border border-[#e4e8f1] bg-white p-2.5 text-center">
                    <span className={`block rounded-full h-2.5 w-2.5 mx-auto ${fill} mb-1.5`}></span>
                    <p className="text-xs font-bold text-[#46516c] leading-tight">{chapter.chapter}</p>
                    {chapter.total && chapter.total > 0 ? <p className="text-xs text-[#8994aa]">{Math.round(chapter.accuracy * 100)}%</p> : <p className="text-xs text-[#a0a8b9]">–</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
    {stats.total ? <div className="grid gap-4 lg:grid-cols-2">
      <Card><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">SUBJECT BREAKDOWN</p><div className="mt-4 space-y-4">{["Physics", "Chemistry", "Mathematics"].map((name) => { const row = stats.subjects.find((item) => item.subject === name) || { correct: 0, total: 0 }; return <div key={name}><div className="flex justify-between text-sm"><span className="font-bold text-[#46516c]">{name}</span><span className="text-xs text-[#73809b]">{row.total ? `${Math.round((row.correct / row.total) * 100)}% · ${row.correct}/${row.total}` : "No answers yet"}</span></div><div className="mt-2 h-1.5 rounded-full bg-[#edf0f6]"><div className="h-full rounded-full bg-[#7564ed]" style={{ width: `${row.total ? (row.correct / row.total) * 100 : 0}%` }} /></div></div>; })}</div></Card>
      <Card><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">TOPICS TO REVISIT</p>{stats.revisit.length ? <div className="mt-4 space-y-3">{stats.revisit.map((row) => <div key={row.subject + row.chapter} className="flex items-center justify-between gap-3 border-b border-[#edf0f5] pb-3 last:border-0 last:pb-0"><span className="text-sm font-bold text-[#46516c]">{row.chapter}<small className="block text-xs font-normal text-[#8994aa]">{row.subject}</small></span><span className="text-xs font-bold text-[#c7586d]">{Math.round((row.correct / row.total) * 100)}% · {row.correct}/{row.total}</span></div>)}</div> : <p className="mt-3 text-sm text-[#73809b]">Nothing to revisit. Every answer so far was correct.</p>}</Card>
    </div> : <Card><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">A NOTE ON YOUR DATA</p><h2 className="mt-2 text-xl font-extrabold text-[#27314c]">Your first insight starts with your first answer.</h2><p className="mt-2 text-sm leading-6 text-[#73809b]">Complete some daily practice, a study task or a test to reveal your accuracy, subject breakdown and topics to revisit. We only show insights based on your real answers.</p></Card>}
    {goal && (
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">GOAL TRACKING</p>
            <h2 className="mt-1 text-lg font-extrabold text-[#27314c]">Your target percentile</h2>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex justify-between gap-x-3 text-sm">
            <span className="font-bold text-[#46516c]">Target {goal.targetPercentile} percentile</span>
            <span className="text-xs text-[#73809b]">about {goal.targetPct}% of the maximum marks</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-[#edf0f6]"><div className={`h-full rounded-full bg-[#7564ed]`} style={{ width: `${Math.min(100, Math.max(0, goal.targetPct))}%` }} /></div>
          {goal.gapMarks != null ? (
            <div className="flex items-center justify-between gap-3 mt-3">
              <span className="text-sm text-[#73809b]">Recent mocks average about {goal.recentMarks} / {maxScore}</span>
              <span className={`text-sm font-bold ${goal.gapMarks > 0 ? "text-[#c7586d]" : "text-[#2c967b]"}`}>{goal.gapMarks > 0 ? `Close a gap of ${goal.gapMarks} marks` : `About ${-goal.gapMarks} marks above the estimate`}</span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#73809b]">Sit at least two mock tests to see the gap against your target.</p>
          )}
        </div>
      </Card>
    )}
    {!goal && profile.goalPercentile && (
      <Card>
        <p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">GOAL TRACKING</p>
        <p className="mt-3 text-sm text-[#73809b]">Target {profile.goalPercentile} percentile saved. Take a couple of mock tests to see your gap.</p>
      </Card>
    )}
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-xs font-semibold text-[#46516b]">Weekly summary</p>
      <div className="flex items-center gap-2">
        <button
          onClick={sendWeeklySummary}
          disabled={weeklySummaryStatus === "sending"}
          className={`rounded-lg px-3 py-2 text-xs font-bold text-[#6958d2] disabled:opacity-40 ${weeklySummaryStatus === "sending" ? "opacity-60" : ""}`}
        >
          {weeklySummaryStatus === "sending" ? "Sending…" : "Send weekly summary to my email"}
        </button>
        {weeklySummaryStatus === "sent" && <span className="text-[10px] font-bold text-[#2c967b]">Sent to {profile.email || "your email"}.</span>}
        {weeklySummaryStatus === "error" && <span className="text-[10px] font-bold text-[#c7586d]">Couldn't send (SMTP may not be configured).</span>}
      </div>
    </div>
    <Card>
      <div className="mt-3 flex items-center gap-4 text-xs text-[#73809b]">
        <span><span className="w-3 h-3 rounded-full bg-[#7564ed] mr-1 ring-2 ring-[#7564ed]"></span> Today</span>
        <span className="font-bold text-[#27314c]">Current streak: {stats.streak} day{stats.streak === 1 ? "" : "s"}</span>
      </div>
    </Card>
    <Card><div className="flex items-start justify-between"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">MILESTONES THAT MEAN SOMETHING</p><h2 className="mt-2 text-xl font-extrabold text-[#27314c]">Your achievements</h2></div><Sparkles className="text-[#7564ed]" /></div><div className="mt-5 space-y-2">{stats.achievements.map(([title, detail, unlocked]) => <div key={title} className="flex items-center gap-3 border-t border-[#edf0f5] py-3"><span className={`grid h-8 w-8 place-items-center rounded-lg ${unlocked ? "bg-[#ddf6ed] text-[#2c967b]" : "bg-[#f1f3f8] text-[#8994aa]"}`}>{unlocked ? <Check size={14} /> : <Target size={14} />}</span><span className="flex-1"><strong className={`block text-sm ${unlocked ? "text-[#27314c]" : "text-[#46516c]"}`}>{title}</strong><small className="text-xs text-[#8994aa]">{detail}</small></span><span className={`text-[10px] font-extrabold ${unlocked ? "text-[#2c967b]" : "text-[#a0a8b9]"}`}>{unlocked ? "UNLOCKED" : "LOCKED"}</span></div>)}</div></Card>
    <p className="text-xs text-[#8994aa]">Your practice history is stored locally in this browser on this device; it isn&apos;t synced to your account.</p>
  </div>;

  const mistakesView = <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">TURN WRONG ANSWERS INTO LEARNING</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#18223c]">Your mistake book</h1>
        <p className="mt-3 text-sm text-[#73809b]">Questions you miss in daily practice are saved here for another look.</p>
      </div>
      <p className="text-sm text-[#8994aa]"><span className="text-2xl font-extrabold text-[#c9ceda]">{mistakes.length}</span> saved</p>
    </div>
    {mistakes.length ? <div className="space-y-4">{mistakes.map((item) => <section key={item.text} className={`rounded-3xl border border-[#e4e8f1] bg-white p-6 ${item.revisited ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <p className="text-[11px] font-extrabold tracking-[.14em] text-[#5e4bc1]">{(reasonLabels[item.reason] || "Reason not selected").toUpperCase()}</p>
        <p className="text-xs text-[#73809b]">{item.subject} · {item.chapter}</p>
      </div>
      <h2 className="mt-4 text-base font-bold leading-7 text-[#25304b]">{item.text}</h2>
      {item.options && <p className="mt-4 text-sm text-[#2c967b]">Correct answer: <span className="font-medium">{item.options[item.answer]}</span></p>}
      {item.explanation && <p className="mt-4 text-sm leading-6 text-[#59647d]">{item.explanation}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-5 text-xs font-bold">
        <button onClick={() => toggleRevisited(item.text)} className="text-[#5e4bc1] hover:underline">{item.revisited ? "Revisited ✓ (undo)" : "Mark as revisited"}</button>
        <button onClick={() => removeMistake(item.text)} className="text-[#bd4a5a] hover:underline">Remove from book</button>
      </div>
    </section>)}</div> : <Card><p className="text-sm text-[#73809b]">Your mistake book is empty. Wrong answers from practice and study tasks appear here automatically.</p></Card>}
  </div>;

  const pyqView = <div className="space-y-5">
    <div><p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">PREVIOUS YEAR QUESTIONS</p><h1 className="text-3xl font-extrabold tracking-tight text-[#18223c]">PYQ practice</h1><p className="mt-2 text-sm text-[#73809b]">Practice JEE questions by subject, chapter, or topic.</p></div>
    <Card><div className="grid gap-4 md:grid-cols-3">
      <label className="text-xs font-bold text-[#46516b]">Subject<select value={pyqSubject} onChange={(event) => { setPyqSubject(event.target.value); setPyqChapter("all"); setPyqTopic("all"); }} className="mt-2 w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm font-normal"><option value="all">All subjects</option>{pyqTaxonomy.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
      <label className="text-xs font-bold text-[#46516b]">Chapter<select value={pyqChapter} onChange={(event) => { setPyqChapter(event.target.value); setPyqTopic("all"); }} className="mt-2 w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm font-normal"><option value="all">All chapters</option>{pyqChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}</select></label>
      <label className="text-xs font-bold text-[#46516b]">Topic<select value={pyqTopic} onChange={(event) => setPyqTopic(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm font-normal"><option value="all">All topics</option>{pyqTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
    </div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f5] pt-4"><p className="text-xs text-[#73809b]"><strong className="text-[#27314c]">{pyqData.total}</strong> question{pyqData.total === 1 ? "" : "s"} match your selection.</p><span className="rounded-full bg-[#f0edff] px-3 py-1 text-[10px] font-extrabold tracking-wide text-[#6958d2]">JEE MAIN + ADVANCED</span></div></Card>
    <div className="space-y-3">
      {pyqData.error && <Card><p className="text-sm text-[#bd4a5a]">{pyqData.error}</p></Card>}
      {!pyqData.error && !pyqData.loading && !filteredPyqs.length && <Card><p className="text-sm text-[#73809b]">No questions are available for this selection yet.</p></Card>}
      {filteredPyqs.map((question, index) => <PyqQuestionCard key={question.id} question={question} index={index} />)}
    </div>
  </div>;

  const profileView = <div className="space-y-5">
    <div>
      <p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">MAKE THIS SPACE YOURS</p>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#18223c]">Your student profile</h1>
      <p className="mt-2 text-sm text-[#73809b]">A few details help shape a preparation plan that fits your real day.</p>
    </div>
    <Card className="max-w-[900px]">
      {/* Minimal consistency heatmap at top of profile */}
      <div className="mb-5">
        <p className="mb-3 text-xs font-extrabold tracking-[.16em] text-[#8993ac]">STUDY CONSISTENCY</p>
        <div className="flex flex-wrap gap-x-4 gap-y-3">
          {monthGroups.map((month) => (
            <div key={month.key} className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-[#8994aa]">{month.label}</span>
              <div className="flex gap-1">
                {month.weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1">
                    {week.map((cell, di) => {
                      if (!cell) return <div key={di} className="h-3 w-3" />;
                      const bg = ["bg-[#ebedf0]", "bg-[#9be9a8]", "bg-[#40c463]", "bg-[#30a14e]", "bg-[#216e39]"][cell.level] || "bg-[#ebedf0]";
                      const [y, m, d] = cell.date.split("-").map(Number);
                      const dateLabel = new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                      return (
                        <div key={di} className={`h-3 w-3 rounded-[3px] ${bg}`} title={cell.count ? `${cell.count} question${cell.count === 1 ? "" : "s"} on ${dateLabel}` : `No activity on ${dateLabel}`} />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-[#8994aa]">
          <span className="mr-1">Less</span>
          {["bg-[#ebedf0]", "bg-[#9be9a8]", "bg-[#40c463]", "bg-[#30a14e]", "bg-[#216e39]"].map((bg) => <span key={bg} className={`h-3 w-3 rounded-[3px] ${bg}`} />)}
          <span className="ml-1">More</span>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-[#e4e8f1] pb-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2e2855] font-extrabold text-white">{profile.name.charAt(0).toUpperCase()}</span>
        <div><p className="text-sm font-extrabold text-[#27314c]">{profile.name || "Student"}</p><p className="mt-1 text-[11px] text-[#73809b]">{profile.email}</p></div>
      </div>
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#46516b]">Target examination
          <select value={profile.target} onChange={(event) => setProfile({ ...profile, target: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm font-normal">
            {["JEE Main", "JEE Advanced", "EAMCET"].map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#46516b]">Target percentile (optional)
          <input type="number" min="50" max="99" value={profile.goalPercentile == null ? "" : profile.goalPercentile} onChange={(event) => setProfile({ ...profile, goalPercentile: event.target.value === "" ? null : Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm font-normal" />
          <span className="mt-2 block text-[10px] font-normal text-[#73809b]">Estimates the marks needed for that percentile and shows the gap against your recent mocks.</span>
        </label>
        <label className="text-xs font-semibold text-[#46516b]">Target exam date
          <input type="date" value={profile.date} onChange={(event) => setProfile({ ...profile, date: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm font-normal" />
          <span className="mt-2 block text-[10px] font-normal text-[#73809b]">We&apos;ll use this date for your countdown and study plan.</span>
        </label>
        <label className="text-xs font-semibold text-[#46516b]">Preparation stage
          <select value={profile.stage} onChange={(event) => setProfile({ ...profile, stage: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm font-normal">
            {["Class 11", "Class 12", "Dropper", "Other"].map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#46516b]">Study hours available per day
          <select value={profile.hours} onChange={(event) => setProfile({ ...profile, hours: event.target.value })} className="mt-2 w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm font-normal">
            {["2 hours", "4 hours", "6+ hours"].map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>
      {[["exams", "Which exams would you like to prepare for?", ["JEE Main", "JEE Advanced", "EAMCET"]], ["strengths", "Which subjects feel strongest?", ["Physics", "Chemistry", "Mathematics"]], ["focus", "Which subjects would you like to work on?", ["Physics", "Chemistry", "Mathematics"]]].map(([key, legend, options]) => <fieldset key={key} className="mt-5 rounded-xl border border-[#dfe5ef] px-4 pb-3 pt-1"><legend className="px-1 text-xs text-[#46516b]">{legend}</legend><div className="flex flex-wrap gap-x-6 gap-y-3 pt-2">{options.map((option) => <label key={option} className="flex items-center gap-2 text-xs text-[#46516b]"><input type="checkbox" checked={profile[key].includes(option)} onChange={() => setProfile({ ...profile, [key]: profile[key].includes(option) ? profile[key].filter((item) => item !== option) : [...profile[key], option] })} className="h-4 w-4 accent-[#7564ed]" />{option}</label>)}</div></fieldset>)}
      <label className="mt-7 block text-xs font-semibold text-[#46516b]">One goal you are working towards
        <input value={profile.goal} onChange={(event) => setProfile({ ...profile, goal: event.target.value })} placeholder="e.g. Finish electrostatics revision this month" className="mt-2 w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm font-normal" />
      </label>
      <div className="mt-7 flex items-center gap-4">
        <Button onClick={async () => {
          setProfileMessage("");
          const response = await fetch("/api/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
          const result = await response.json();
          if (!response.ok) setProfileMessage(result.error || "Unable to save preferences.");
          else setProfileMessage("Preferences saved successfully.");
        }}>Save my preferences</Button>
        {profileMessage && <p role="status" className="text-xs font-bold text-[#2c967b]">{profileMessage}</p>}
      </div>
    </Card>
  </div>;

  const liveSessions = <div className="space-y-5"><div className="flex items-start justify-between"><div><p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">LEARN FROM STUDENTS WHO&apos;VE BEEN THERE</p><h1 className="text-3xl font-extrabold text-[#18223c]">Live sessions</h1><p className="mt-2 text-sm text-[#73809b]">Online conversations and Q&amp;A with students from IITs, NITs and IIITs are being planned.</p></div><span className="rounded-full bg-[#fff3dc] px-3 py-1.5 text-[10px] font-extrabold tracking-widest text-[#b67821]">IN PLANNING</span></div><Card className="max-w-2xl"><CircleHelp size={22} className="text-[#7564ed]" /><p className="mt-4 text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">COMING SOON</p><h2 className="mt-2 text-xl font-extrabold text-[#27314c]">Real experiences. Practical guidance.</h2><p className="mt-2 text-sm leading-6 text-[#73809b]">We&apos;re working towards live online sessions where current students from IITs, NITs and IIITs can share their experiences and answer your questions about preparation and campus life.</p><p className="mt-3 text-sm leading-6 text-[#73809b]">Session dates, speakers and joining details will be shared once confirmed.</p></Card></div>;
  const content = {
    overview,
    "study-plan": plan,
    practice,
    pyq: pyqView,
    "mock-tests": mockTests,
    challenge,
    "live-sessions": liveSessions,
    "mentor-solutions": (
      <StudentWrittenSolutions
        onUpdated={() => {
          fetch("/api/me/written-solutions")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d?.requests && setWrittenSolutions(d.requests))
            .catch(() => {});
        }}
      />
    ),
    aiTutor: aiTutorBlock,
    mistakes: mistakesView,
    "study-circle": <StudyCircle onInvitesChange={setGroupInvites} />,
    progress,
    profile: profileView,
  }[view] || overview;
  const siteLinks = [["/", "Home"], ["/dashboard", "My dashboard"], ["/about", "About"], ["/features", "Features"], ["/resources", "Resources"], ["/faq", "FAQ"]];
  const collapsed = sidebarCollapsed;
  const bell = (
    <NotificationBell
      ready={loaded}
      onOpenView={go}
      readRecords={notificationReads}
      onMarkRead={markNotificationsRead}
      contestHistory={histories.contest}
      mockHistory={histories.mock}
      groupInvites={groupInvites}
      writtenSolutions={writtenSolutions}
      registered={registered}
      planTasks={planTasks}
      completed={completed}
      mistakes={mistakes}
      streak={stats.streak}
      todayCount={stats.todayCount}
      examDays={examDays}
    />
  );
  const brand = (hideLabel) => <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="JEE Compass home">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#a897ff] to-[#6edcdb] font-extrabold text-[#1c2140]">J</span>
    <span className={`text-base font-extrabold tracking-tight text-[#1d2945] ${hideLabel ? "lg:hidden" : ""}`}>JEE<span className="ml-0.5 block text-[8px] tracking-[.25em] text-[#808aa8]">COMPASS</span></span>
  </Link>;

  return <div className="dashboard-theme min-h-screen overflow-x-clip bg-[#f7f8fc]">
    <header className={`fixed inset-x-0 top-0 z-30 flex h-16 items-center gap-2 border-b border-[#e4e8f1] bg-white/95 px-3 backdrop-blur transition-[left] duration-200 sm:gap-3 sm:px-5 lg:px-8 ${collapsed ? "lg:left-16" : "lg:left-64"}`}>
      <button onClick={() => setMenuOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[#34405b] hover:bg-[#f4f5fb] lg:hidden" aria-label="Open navigation"><Menu size={22} /></button>
      <div className="min-w-0 lg:hidden">{brand(false)}</div>
      <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
        {siteLinks.map(([href, label]) => <Link key={href} href={href} className={`rounded-lg px-3 py-2 text-sm font-semibold ${href === "/dashboard" ? "bg-[#eef0ff] text-[#263252]" : "text-[#64728d] hover:bg-[#f4f5fb]"}`}>{label}</Link>)}
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
        <span className="hidden text-xs text-[#8994aa] xl:block">{new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
        <ThemeToggle className="!rounded-lg !border-[#e4e8f1]" />
        {bell}
        <button onClick={() => go("profile")} className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-bold text-[#34405b] hover:bg-[#f4f5fb]" aria-label="My profile"><UserRound size={18} /><span className="hidden max-w-[9rem] truncate sm:inline">{profile.name}</span></button>
      </div>
    </header>

    <aside aria-label="Workspace navigation" className={`fixed inset-y-0 left-0 z-40 flex h-[100dvh] w-[min(18rem,calc(100vw-1rem))] flex-col border-r border-[#e4e8f1] bg-white transition-all duration-200 lg:translate-x-0 ${collapsed ? "lg:w-16" : "lg:w-64"} ${menuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
      <div className={`flex h-16 shrink-0 items-center justify-between gap-2 border-b border-[#edf0f5] px-4 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
        {brand(collapsed)}
        <button onClick={() => setMenuOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#6d7891] hover:bg-[#f4f5fb] lg:hidden" aria-label="Close navigation"><X size={20} /></button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        <div className="lg:hidden">
          <p className="px-3 text-[10px] font-extrabold tracking-[.18em] text-[#a0a8b9]">MAIN NAVIGATION</p>
          <nav aria-label="Main navigation" className="mb-5 mt-2 space-y-1">
            {siteLinks.map(([href, label]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`block rounded-xl px-3 py-2.5 text-sm font-semibold ${href === "/dashboard" ? "bg-[#eef0ff] text-[#263252]" : "text-[#6d7891] hover:bg-[#f7f8fc]"}`}>{label}</Link>)}
          </nav>
        </div>
        <p className={`px-3 text-[10px] font-extrabold tracking-[.18em] text-[#a0a8b9] ${collapsed ? "lg:hidden" : ""}`}>YOUR WORKSPACE</p>
        <nav aria-label="Workspace" className="mt-2 space-y-1">
          {navItems.map(([id, label, Icon]) => <button key={id} onClick={() => go(id)} title={label} aria-current={view === id ? "page" : undefined} className={`flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold ${collapsed ? "lg:justify-center lg:px-0" : ""} ${view === id ? "bg-[#f0edff] text-[#5e4bc1]" : "text-[#6d7891] hover:bg-[#f7f8fc]"}`}>
            <Icon className="shrink-0" size={18} />
            <span className={`min-w-0 flex-1 truncate ${collapsed ? "lg:hidden" : ""}`}>{label}</span>
            {id === "live-sessions" && <small className={`shrink-0 whitespace-nowrap text-[9px] font-extrabold text-[#a0a8b9] ${collapsed ? "lg:hidden" : ""}`}>PLANNING</small>}
          </button>)}
        </nav>
      </div>

      <div className="shrink-0 space-y-1 border-t border-[#edf0f5] p-3">
        <button onClick={() => setSidebarCollapsed((value) => !value)} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className={`hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[#6d7891] hover:bg-[#f0edff] lg:flex ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}<span className={collapsed ? "lg:hidden" : ""}>Collapse</span>
        </button>
        <button onClick={logOut} title="Log out" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[#7b879e] hover:text-[#bd5050] ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
          <LogOut size={18} className="shrink-0" /><span className={collapsed ? "lg:hidden" : ""}>Log out</span>
        </button>
      </div>
    </aside>
    {menuOpen && <button aria-label="Close menu overlay" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[35] bg-[#18223c]/30 lg:hidden" />}

    <main className={`min-h-screen min-w-0 pt-16 transition-[padding] duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-64"}`}>
      <nav aria-label="Dashboard navigation" className="sticky top-16 z-20 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-[#e4e8f1] bg-white px-3 py-2 sm:px-5 lg:hidden">
        {navItems.map(([id, label, Icon]) => <button key={id} onClick={() => go(id)} aria-current={view === id ? "page" : undefined} className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${view === id ? "bg-[#f0edff] text-[#5e4bc1]" : "text-[#6d7891]"}`}><Icon size={15} />{label}</button>)}
      </nav>
      <div className="mx-auto min-w-0 max-w-[1180px] px-4 py-6 sm:px-5 lg:mx-0 lg:max-w-none lg:px-8 lg:py-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-[#7c879e]">Your focused preparation workspace</p><span className="rounded-full bg-[#f0edff] px-3 py-1 text-xs font-bold text-[#6553c4]">{viewLabel}</span></div>
        {content}
      </div>
    </main>
  </div>;
}

export default function Dashboard() { return <DashboardApp />; }
