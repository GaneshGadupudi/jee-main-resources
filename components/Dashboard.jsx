"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import StudyTask from "@/components/StudyTask";
import WeeklyChallenge from "@/components/WeeklyChallenge";
import MockTests from "@/components/MockTests";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import { dayKey, summarize } from "@/lib/progress";
import { buildPlan, daysUntil, planMode, todayKey, weightLabel } from "@/lib/plan";
import { allPyqQuestions, pyqSubjects } from "@/lib/pyq";
import {
  BookOpen, BrainCircuit, Check, ChevronRight, CircleHelp, Clock3,
  Flame, Home, LayoutDashboard, ListChecks, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Play, 
  BookMarked, Sparkles, Target, Trophy, UserRound, X, Zap,
} from "lucide-react";

const questions = [
  { subject: "Physics", chapter: "Kinematics", text: "A particle's velocity is v(t) = 3t² + 2 m/s. What is its acceleration at t = 2 s?", options: ["6 m/s²", "12 m/s²", "14 m/s²", "18 m/s²"], answer: 1, explanation: "Acceleration is dv/dt = 6t. At t = 2 s, a = 12 m/s²." },
  { subject: "Chemistry", chapter: "Atomic Structure", text: "How many electrons does a neutral sodium atom have in its outermost shell?", options: ["1", "2", "3", "8"], answer: 0, explanation: "Sodium's configuration is 2, 8, 1, so it has 1 electron in its outermost shell." },
  { subject: "Mathematics", chapter: "Differentiation", text: "What is the derivative of x³ with respect to x?", options: ["x²", "2x", "3x²", "3x"], answer: 2, explanation: "By the power rule, d/dx(xⁿ) = n·xⁿ⁻¹, so d/dx(x³) = 3x²." },
];

const navItems = [
  ["overview", "Overview", Home], ["study-plan", "Study plan", ListChecks],
  ["practice", "Daily practice", BrainCircuit], ["pyq", "PYQ practice", BookMarked], ["mock-tests", "Mock tests", Clock3],
  ["challenge", "Weekly challenge", Trophy], ["live-sessions", "Live sessions", CircleHelp],
  ["mistakes", "Mistake book", BookOpen],
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
  const [pyqAnswer, setPyqAnswer] = useState({});

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const [{ data: authData }] = await Promise.all([getSupabase().auth.getUser()]);
        if (!active) return;
        const user = authData.user;
        const savedProfile = user?.user_metadata?.student_profile;
        const savedExams = user?.user_metadata?.exams;
        setProfile((current) => ({
          ...current,
          name: user?.user_metadata?.name || user?.email?.split("@")[0] || "Student",
          email: user?.email || "",
          ...(savedProfile ? {
            target: savedProfile.targetExam || current.target,
            date: savedProfile.examDate || current.date,
            hours: savedProfile.dailyHours || current.hours,
            stage: savedProfile.prepStage || current.stage,
            strengths: savedProfile.strengths || current.strengths,
            focus: savedProfile.focus || current.focus,
            goal: savedProfile.goal || current.goal,
          } : {}),
          ...(Array.isArray(savedExams) ? { exams: savedExams } : {}),
        }));
        setCompleted(JSON.parse(localStorage.getItem("jee-completed") || "[]"));
        setMistakes(JSON.parse(localStorage.getItem("jee-mistakes") || "[]"));
        setRegistered(localStorage.getItem("jee-challenge") === "true");
        setChapterHistory(JSON.parse(localStorage.getItem("jee-chapters-done") || "[]"));
        setScores(JSON.parse(localStorage.getItem("jee-scores") || "{}"));
        setAnswers(JSON.parse(localStorage.getItem("jee-answers") || "[]"));
        setDoneLog(JSON.parse(localStorage.getItem("jee-done") || "[]"));
        setTimeLog(JSON.parse(localStorage.getItem("jee-time") || "[]"));
      } catch { /* local storage is optional */ }
      if (active) setLoaded(true);
    }
    loadDashboard();
    return () => { active = false; };
  }, []);

  const update = (key, value, setter) => { setter(value); localStorage.setItem(key, JSON.stringify(value)); };
  const go = (next) => { setView(next); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const logOut = async () => {
    const { error } = await getSupabase().auth.signOut();
    if (error) return;
    window.location.href = "/";
  };
  const markDone = (id) => { const today = dayKey(); if (!doneLog.some((entry) => entry.d === today && entry.id === id)) update("jee-done", [...doneLog, { d: today, id, m: planTasks.find((task) => task.id === id)?.minutes || 0 }], setDoneLog); };
  const toggleTask = (id) => {
    const finishing = !completed.includes(id);
    update("jee-completed", finishing ? [...completed, id] : completed.filter((item) => item !== id), setCompleted);
    if (finishing) markDone(id); else update("jee-done", doneLog.filter((entry) => !(entry.d === dayKey() && entry.id === id)), setDoneLog);
  };
  const logAnswers = (list) => update("jee-answers", [...answers, ...list].slice(-3000), setAnswers);
  const logTest = ({ questions: paper, answers: given, timeTaken, source }) => {
    logAnswers(paper.flatMap((question, index) => given[index] === null ? [] : [{ d: dayKey(), src: source, s: question.subject, c: question.chapter, q: question.text, ok: given[index] === question.answer }]));
    update("jee-time", [...timeLog, { d: dayKey(), m: Math.max(1, Math.round(timeTaken / 60000)) }], setTimeLog);
  };
  const setMistakeReasonFor = (text, reason) => update("jee-mistakes", mistakes.map((item) => item.text === text ? { ...item, reason } : item), setMistakes);
  const toggleRevisited = (text) => update("jee-mistakes", mistakes.map((item) => item.text === text ? { ...item, revisited: !item.revisited } : item), setMistakes);
  const removeMistake = (text) => update("jee-mistakes", mistakes.filter((item) => item.text !== text), setMistakes);
  const addMistakes = (list) => { const fresh = list.filter((question) => !mistakes.some((item) => item.text === question.text)); if (fresh.length) update("jee-mistakes", [...mistakes, ...fresh], setMistakes); };
  const addMistake = (question) => { if (!mistakes.some((item) => item.text === question.text)) update("jee-mistakes", [...mistakes, question], setMistakes); };
  const finishTask = (task, result) => {
    if (!completed.includes(task.id)) update("jee-completed", [...completed, task.id], setCompleted);
    markDone(task.id);
    if (task.chapterId && !chapterHistory.includes(task.chapterId)) update("jee-chapters-done", [...chapterHistory, task.chapterId], setChapterHistory);
    update("jee-scores", { ...scores, [task.id]: result }, setScores);
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
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("jee-plan") || "null"); } catch { /* ignore */ }
    if (saved && saved.date === today && saved.signature === planSignature) { setPlanTasks(saved.tasks); return; }
    const sameDay = saved && saved.date === today;
    const keep = sameDay ? saved.tasks.filter((task) => task.type === "chapter" && completed.includes(task.id)) : [];
    const tasks = buildPlan({ profile, daysLeft: daysUntil(profile.date), doneChapters: chapterHistory, keep });
    localStorage.setItem("jee-plan", JSON.stringify({ date: today, signature: planSignature, tasks }));
    setPlanTasks(tasks);
    if (!sameDay) update("jee-completed", [], setCompleted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, planSignature]);
  const planDone = planTasks.filter((task) => completed.includes(task.id)).length;
  const planTotal = planTasks.length || 1;
  const mode = planMode(examDays);
  const stats = summarize({ answers, done: doneLog, timeLog, hoursPerDay: profile.hours, dailySetSize: questions.length });
  const weekHours = (stats.weekMinutes / 60).toFixed(1);
  const weekTargetHours = Math.round(stats.weekTarget / 60);
  const weekPercent = Math.min(100, Math.round((stats.weekMinutes / stats.weekTarget) * 100));
  const todayLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const choosePracticeAnswer = (index) => {
    if (practiceAnswer !== null) return;
    setPracticeAnswer(index);
    logAnswers([{ d: dayKey(), src: "daily", s: currentQuestion.subject, c: currentQuestion.chapter, q: currentQuestion.text, ok: index === currentQuestion.answer }]);
    if (index !== currentQuestion.answer && !mistakes.some((item) => item.text === currentQuestion.text)) {
      update("jee-mistakes", [...mistakes, { ...currentQuestion, reason: "" }], setMistakes);
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
  const selectedPyqSubject = pyqSubjects.find((subject) => subject.id === pyqSubject);
  const pyqChapters = selectedPyqSubject?.chapters || pyqSubjects.flatMap((subject) => subject.chapters);
  const pyqTopics = pyqChapters.filter((chapter) => pyqChapter === "all" || chapter.id === pyqChapter).flatMap((chapter) => chapter.topics);
  const filteredPyqs = allPyqQuestions.filter((question) => (pyqSubject === "all" || question.subject === selectedPyqSubject?.name) && (pyqChapter === "all" || question.chapter === pyqChapters.find((chapter) => chapter.id === pyqChapter)?.name) && (pyqTopic === "all" || question.topic === pyqTopics.find((topic) => topic.id === pyqTopic)?.name));
  const overview = <div className="space-y-4"><section className="flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-2xl border border-[#dcd8fb] bg-gradient-to-r from-[#f1efff] to-[#fbfbff] p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7e1ff] text-[#7564ed]"><Clock3 size={18} /></span><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">YOUR NEXT EXAM</p><h2 className="mt-1 text-sm font-extrabold text-[#27314c]">{profile.target}</h2><p className="mt-1 text-[10px] text-[#7d879e]">Your {profile.target} target date is {examDateLabel}.</p></div></div><div className="flex items-center gap-3"><div className="text-right"><strong className="block text-3xl font-extrabold text-[#282354]">{examDays}</strong><span className="text-[10px] text-[#7d879e]">days to go</span></div><button onClick={() => go("profile")} className="grid h-8 w-8 place-items-center rounded-lg border border-[#dcd8fb] bg-white text-[#7564ed]" aria-label="Edit exam date"><ChevronRight size={15} /></button></div></section><div className="grid gap-4 lg:grid-cols-[1.35fr_.9fr]"><Card><div className="flex items-start justify-between"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">BUILD YOUR RHYTHM</p><h2 className="mt-1 text-sm font-extrabold text-[#27314c]">Daily consistency</h2></div><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f0edff] text-[#7564ed]"><Flame size={15} /></span></div><div className="mt-4 flex items-end gap-2"><strong className="text-2xl text-[#202944]">{stats.streak}</strong><span className="mb-1 text-[10px] text-[#7d879e]">day streak</span></div><p className="mt-2 text-[10px] leading-5 text-[#7d879e]">Show up for one focused session today. Small steps compound.</p><div className="mt-4 flex justify-between text-[9px] font-bold text-[#9aa3b5]">{stats.week.map((day) => <span key={day.key} title={day.key} className={`grid h-6 w-6 place-items-center rounded-full ${day.active ? "bg-[#7564ed] text-white" : "bg-[#f1f3f7]"} ${day.today ? "ring-1 ring-[#b9adff] ring-offset-1" : ""}`}>{day.label}</span>)}</div></Card><Card><div className="flex items-start justify-between"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">THIS WEEK</p><h2 className="mt-1 text-sm font-extrabold text-[#27314c]">Weekly target</h2></div><button onClick={() => go("progress")} className="text-[10px] font-bold text-[#7564ed]">Details →</button></div><div className="mt-4 flex items-end gap-1"><strong className="text-2xl text-[#202944]">{weekHours}</strong><span className="mb-1 text-[10px] text-[#7d879e]">/ {weekTargetHours} hrs</span><span className="mb-1 ml-auto text-[9px] font-bold text-[#7564ed]">{weekPercent}%</span></div><div className="mt-3 h-1.5 rounded-full bg-[#edf0f6]"><div className="h-full rounded-full bg-[#7564ed]" style={{ width: `${weekPercent}%` }} /></div><p className="mt-3 text-[10px] text-[#7d879e]">Study tasks and practice keep your target moving.</p></Card></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Check} label="Plan completed" value={`${Math.round((planDone / planTotal) * 100)}%`} hint={`${planDone} of ${planTotal} tasks`} tone="bg-[#eeeaff] text-[#6855d0]" /><Metric icon={BrainCircuit} label="Questions today" value={stats.todayCount} hint="Start your daily practice" tone="bg-[#e4f8f5] text-[#278f82]" /><Metric icon={Flame} label="Study streak" value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`} hint="One day at a time" tone="bg-[#fff3dc] text-[#b67821]" /><Metric icon={BookOpen} label="Mistakes to revisit" value={mistakes.length} hint="Your personal revision list" tone="bg-[#ffe8eb] text-[#c7586d]" /></div><div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]"><Card><div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">YOUR PERSONAL PLAN</p><h2 className="mt-1 text-sm font-extrabold text-[#27314c]">Today&apos;s study plan</h2></div><button onClick={() => go("study-plan")} className="text-[10px] font-extrabold text-[#6958d2]">See all →</button></div><div className="mt-4 space-y-1">{planTasks.slice(0, 4).map((task) => <button key={task.id} onClick={() => go("study-plan")} className="flex w-full items-center gap-3 border-b border-[#edf0f5] py-3 text-left last:border-0"><span className={`grid h-5 w-5 place-items-center rounded-md border text-[10px] ${completed.includes(task.id) ? "border-[#9ad7c9] bg-[#ddf6ed] text-[#2c967b]" : "border-[#cdd4e2] bg-white text-transparent"}`}><Check size={12} /></span><span className={`flex-1 text-xs font-bold ${completed.includes(task.id) ? "text-[#8d96a8] line-through" : "text-[#46516c]"}`}>{task.title}<small className="mt-1 block text-[9px] font-normal text-[#9aa3b5]">{task.type === "chapter" ? `${task.subject} · ${task.chapter}` : task.type === "mistakes" ? "Revision · Mistake book review" : "Study routine · Daily commitment"}</small></span><span className="text-[9px] text-[#8994aa]">{task.minutes} min</span></button>)}</div><div className="mt-3 h-1.5 rounded-full bg-[#edf0f6]"><div className="h-full rounded-full bg-[#7564ed]" style={{ width: `${Math.round((planDone / planTotal) * 100)}%` }} /></div><p className="mt-2 text-right text-[9px] text-[#8994aa]">{planDone} of {planTotal} complete</p></Card><Card className="border-[#dcd8fb] bg-gradient-to-br from-[#f4f1ff] to-white"><div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8175bd]">DAILY PRACTICE</p><h2 className="mt-1 text-sm font-extrabold text-[#29274e]">Problems of the day</h2></div><span className="text-[9px] font-extrabold text-[#4bbd99]">TODAY</span></div><p className="mt-4 text-xs leading-5 text-[#707b94]">A focused set across Physics, Chemistry and Mathematics, with explanations to learn from every answer.</p><div className="mt-4 flex flex-wrap gap-2 text-[10px]"><span className="rounded-lg border border-[#dce8f6] bg-white px-2 py-1 text-[#5f82ac]">Physics 5</span><span className="rounded-lg border border-[#eadff8] bg-white px-2 py-1 text-[#8465b6]">Chemistry 5</span><span className="rounded-lg border border-[#f0e4c9] bg-white px-2 py-1 text-[#b0833b]">Maths 5</span></div><p className="mt-4 text-[9px] text-[#8994aa]">15 questions · About 25 min</p><Button className="mt-4 w-full" onClick={() => go("practice")}>Start daily practice <ChevronRight size={14} /></Button></Card></div><div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]"><Card><div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">WEEKLY CHALLENGE</p><h2 className="mt-1 text-sm font-extrabold text-[#27314c]">Your weekend checkpoint</h2></div><Trophy size={16} className="text-[#d29a3a]" /></div><p className="mt-3 text-[10px] leading-5 text-[#7d879e]">A common, timed challenge for participating students. Your score, rank and percentile appear here after a challenge opens.</p><div className="mt-3 rounded-xl border border-[#e4e8f1] bg-[#fafbfe] p-3 text-[10px] text-[#69758d]"><div className="flex justify-between py-1"><span>Physics</span><b>25</b></div><div className="flex justify-between py-1"><span>Chemistry</span><b>25</b></div><div className="flex justify-between py-1"><span>Maths</span><b>25</b></div><div className="mt-1 flex justify-between border-t border-[#e4e8f1] pt-2"><span>Total</span><b>75 questions</b></div></div><button onClick={() => go("challenge")} className="mt-3 w-full rounded-xl border border-[#dfe3ef] px-3 py-2 text-[10px] font-extrabold text-[#34405b]">Explore challenge →</button></Card><Card><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">YOUR NEXT STEP</p><h2 className="mt-1 text-sm font-extrabold text-[#27314c]">Keep your momentum</h2><p className="mt-4 text-sm font-bold text-[#46516c]">&quot;Consistent beats long, random hours.&quot;</p><p className="mt-3 text-[10px] leading-5 text-[#7d879e]">Complete a study task or try today&apos;s practice to start building a picture of your progress.</p><button onClick={() => go("progress")} className="mt-4 text-[10px] font-extrabold text-[#6958d2]">View my progress →</button></Card></div><Card className="flex flex-wrap items-center justify-between gap-4 border-[#dcd8fb] bg-gradient-to-r from-[#f4f1ff] to-white"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8175bd]">YOUR ON-DEMAND COMPANION</p><h2 className="mt-1 text-sm font-extrabold text-[#29274e]">A little help goes a long way</h2></div><div className="flex items-center gap-3"><Button onClick={() => go("practice")}>Open AI tutor →</Button><button onClick={() => go("practice")} className="text-[10px] font-bold text-[#7564ed]">Connect with a mentor</button></div></Card></div>;

  const activePlanTask = planTasks.find((task) => task.id === activeTaskId);
  const taskMeta = (task) => task.type === "chapter" ? `${task.subject} · ${weightLabel(task.weight)} · ${task.minutes} min` : task.type === "mistakes" ? `Revision · Mistake-book review · ${task.minutes} min` : `Study routine · Your daily commitment · ${task.minutes} min`;
  const plan = activePlanTask
    ? <StudyTask key={activePlanTask.id} task={activePlanTask} nextTitle={planTasks[planTasks.indexOf(activePlanTask) + 1]?.title} onBack={() => setActiveTaskId(null)} onAnswer={(a) => logAnswers([{ d: dayKey(), src: "plan", s: a.subject, c: a.chapter, q: a.text, ok: a.correct }])} onWrong={addMistake} onReason={setMistakeReasonFor} onComplete={(result) => finishTask(activePlanTask, result)} />
    : <div className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">PLAN YOUR PREPARATION</p><h1 className="text-3xl font-extrabold text-[#18223c]">Today&apos;s study plan</h1><p className="mt-2 text-sm text-[#73809b]">A clear, manageable next step, planned around your {profile.hours} available study hours.</p></div><span className="text-xs text-[#8994aa]">{todayLabel}</span></div><Card className="border-[#dcd8fb] bg-gradient-to-r from-[#f4f1ff] to-white"><p className="text-sm text-[#59647d]"><strong>{examDays} days to your exam · {mode.label}.</strong> {mode.note}</p></Card><Card><div className="mb-4 flex justify-between"><div><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">DAILY TASKS</p><h2 className="mt-1 text-lg font-extrabold text-[#27314c]">Focus for today</h2></div><span className="text-xs text-[#8994aa]">{planTasks.length} tasks</span></div>{planTasks.map((task, index) => { const unlocked = index === 0 || completed.includes(planTasks[index - 1].id); const done = completed.includes(task.id); const score = scores[task.id]; return <div key={task.id} className="flex flex-wrap items-center gap-x-3 gap-y-3 border-t border-[#edf0f5] py-4">{task.type === "chapter" ? <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${done ? "border-[#9ad7c9] bg-[#ddf6ed] text-[#2c967b]" : "border-[#cdd4e2] bg-white text-transparent"}`}><Check size={12} /></span> : <input type="checkbox" checked={done} disabled={!unlocked} onChange={() => toggleTask(task.id)} className="mt-1 h-5 w-5 shrink-0 accent-[#7564ed] disabled:opacity-50" aria-label={`${done ? "Complete" : "Not started"}: ${task.title}`} />}<span className={`min-w-0 flex-1 basis-[calc(100%-2rem)] text-sm font-bold sm:basis-0 ${done ? "text-[#2c967b] line-through" : "text-[#46516c]"}`}>{task.title}<small className="mt-1 block break-words text-[10px] font-normal leading-4 text-[#8994aa]">{taskMeta(task)}</small></span><div className="flex w-full items-center justify-between gap-3 pl-8 sm:w-auto sm:pl-0"><span className={`text-[10px] leading-4 sm:w-44 sm:text-right ${unlocked ? "text-[#8994aa]" : "text-[#aeb5c2]"}`}>{done ? (score?.total ? `Completed · ${score.correct}/${score.total} correct` : "Completed") : unlocked ? "Not started" : "Complete previous task to unlock"}</span><span className="flex w-28 shrink-0 justify-end">{task.type === "chapter" && <button disabled={!unlocked} onClick={() => setActiveTaskId(task.id)} className="w-24 rounded-lg bg-[#f0edff] px-3 py-2 text-center text-xs font-extrabold text-[#5e4bc1] hover:bg-[#e5e0ff] disabled:cursor-not-allowed disabled:opacity-40">{done ? "Review" : "Start"}</button>}{task.type === "mistakes" && unlocked && <button onClick={() => go("mistakes")} className="w-24 rounded-lg bg-[#f0edff] px-3 py-2 text-center text-xs font-extrabold text-[#5e4bc1] hover:bg-[#e5e0ff]">Open book</button>}</span></div></div>; })}<div className="mt-3 h-1.5 rounded-full bg-[#edf0f6]"><div className="h-full rounded-full bg-[#7564ed]" style={{ width: `${Math.round((planDone / planTotal) * 100)}%` }} /></div><p className="mt-2 text-right text-[10px] text-[#8994aa]">{planDone} of {planTotal} complete</p></Card><Card className="max-w-2xl border-[#dcd8fb] bg-gradient-to-r from-[#f4f1ff] to-white"><p className="text-sm text-[#59647d]"><strong>Make the plan yours.</strong> Your exam date, available hours and strong or weak subjects help shape what you work on next.</p><button onClick={() => go("profile")} className="mt-3 text-xs font-extrabold text-[#6958d2]">Edit preferences →</button></Card></div>;

  const practice = <div className="space-y-5"><div><p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">BUILD YOUR DAILY HABIT</p><h1 className="text-3xl font-extrabold text-[#18223c]">Daily practice</h1><p className="mt-2 text-sm text-[#73809b]">Answer, understand your mistake, and keep your revision list current.</p></div><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_290px]"><Card><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-extrabold text-[#7564ed]">{currentQuestion.subject.toUpperCase()}</span><span className="text-xs text-[#8994aa]">Question {practiceIndex + 1} of {questions.length}</span></div><p className="mt-4 text-xs font-bold text-[#7564ed]">{currentQuestion.chapter}</p><h2 className="mt-3 text-xl font-extrabold leading-8 text-[#25304b]">{currentQuestion.text}</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{currentQuestion.options.map((option, index) => <button key={option} onClick={() => choosePracticeAnswer(index)} className={`min-h-14 rounded-xl border p-4 text-left text-sm font-semibold leading-6 transition ${practiceAnswer === index ? "border-[#8273df] bg-[#f1efff]" : "border-[#e4e8f1] bg-[#fafbfe] hover:border-[#bcb2f0]"}`}>{String.fromCharCode(65 + index)}. {option}</button>)}</div>{practiceAnswer !== null && <div className={`mt-5 rounded-xl p-4 text-sm leading-6 ${practiceAnswer === currentQuestion.answer ? "bg-[#e4f8f5] text-[#247b70]" : "bg-[#fff1f1] text-[#a34e5c]"}`}>{practiceAnswer === currentQuestion.answer ? "Correct! Great work." : <><div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center"><span className="min-w-0 break-words">Added to your mistake book. Tell us what went wrong so we can target it.</span><div className="relative w-full min-w-0 sm:w-auto sm:max-w-[15rem]"><button type="button" aria-expanded={mistakeReasonOpen} onClick={() => setMistakeReasonOpen((open) => !open)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#efc3c3] bg-white p-2 text-left text-xs text-[#59647d]"><span className="min-w-0 truncate">{mistakeReason || "Why was it wrong?"}</span><ChevronRight size={14} className={`shrink-0 transition-transform ${mistakeReasonOpen ? "rotate-90" : ""}`} /></button>{mistakeReasonOpen && <div role="listbox" className="mt-1 w-full overflow-hidden rounded-lg border border-[#efc3c3] bg-white shadow-lg">{mistakeReasons.map((reason) => <button key={reason} type="button" role="option" aria-selected={mistakeReason === reason} onClick={() => { setMistakeReason(reason); setMistakeReasonOpen(false); const updated = mistakes.map((item) => item.text === currentQuestion.text ? { ...item, reason } : item); update("jee-mistakes", updated, setMistakes); }} className="block w-full px-3 py-2 text-left text-xs text-[#59647d] hover:bg-[#f5f2ff]">{reason}</button>)}</div>}</div></div></>}</div>}<div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f5] pt-5"><span className="text-xs text-[#8994aa]">{practiceAnswer === null ? "Choose an answer to continue" : practiceAnswer === currentQuestion.answer ? "Answer checked" : "Tell us why it was wrong to continue"}</span><Button disabled={practiceAnswer === null || practiceIndex === questions.length - 1 || (practiceAnswer !== currentQuestion.answer && !mistakeReason)} onClick={nextPracticeQuestion} className="w-full sm:w-auto">{practiceIndex === questions.length - 1 ? "Practice complete" : "Next question"} <ChevronRight size={16} /></Button></div></Card><Card className="h-fit bg-gradient-to-b from-[#f4f1ff] to-white"><div className="flex items-center gap-2 text-[#5e4bc1]"><Sparkles size={18} /><h2 className="font-extrabold">AI tutor</h2></div><p className="mt-3 text-sm leading-6 text-[#68738b]">Ask a small doubt about this question and get a concise hint before checking the answer.</p><textarea placeholder="Type your doubt..." className="mt-4 h-24 w-full resize-y rounded-xl border border-[#ddd8f6] bg-white p-3 text-sm outline-none" /><Button variant="soft" className="mt-3 w-full"><BrainCircuit size={16} /> Get a hint</Button><div className="mt-4 border-t border-[#e6e1f7] pt-4"><p className="text-xs font-bold text-[#59647d]">Still unclear?</p><button onClick={() => setMentorRequested(true)} className="mt-2 text-sm font-extrabold text-[#6958d2]">Request a mentor</button>{mentorRequested && <p role="status" className="mt-2 rounded-lg bg-[#ddf6ed] p-2 text-xs font-bold text-[#2c967b]">Mentor requested</p>}</div></Card></div></div>;

  const mockTests = <MockTests daysLeft={examDays} onAddMistakes={addMistakes} onFinish={logTest} onReason={setMistakeReasonFor} onExit={() => go("overview")} />;


  const challenge = <WeeklyChallenge onFinish={logTest} registered={registered} setRegistered={(value) => { setRegistered(value); localStorage.setItem("jee-challenge", String(value)); }} onAddMistakes={addMistakes} onReason={setMistakeReasonFor} onExit={() => go("overview")} />;

  const progress = <div className="space-y-5">
    <div><p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">YOUR PREPARATION, OVER TIME</p><h1 className="text-3xl font-extrabold text-[#18223c]">Progress &amp; insights</h1><p className="mt-2 text-sm text-[#73809b]">A useful picture built from your real practice, tests and study-task activity.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Metric icon={BrainCircuit} label="Questions answered" value={stats.total} hint={`${stats.todayCount} today`} tone="bg-[#e4f8f5] text-[#278f82]" />
      <Metric icon={Target} label="Practice accuracy" value={stats.accuracy === null ? "–" : `${stats.accuracy}%`} hint={stats.total ? `${stats.correct} of ${stats.total} correct` : "Answer a question to see this"} tone="bg-[#eeeaff] text-[#6855d0]" />
      <Metric icon={Check} label="Study tasks done" value={stats.tasksDone} hint="All time, on this device" tone="bg-[#fff3dc] text-[#b67821]" />
      <Metric icon={Flame} label="Study streak" value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`} hint="Days in a row with activity" tone="bg-[#ffe8eb] text-[#c7586d]" />
      <Metric icon={Clock3} label="Study time this week" value={`${weekHours} hrs`} hint={`Target ${weekTargetHours} hrs`} tone="bg-[#e8f0ff] text-[#4c74c7]" />
    </div>
    {stats.total ? <div className="grid gap-4 lg:grid-cols-2">
      <Card><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">SUBJECT BREAKDOWN</p><div className="mt-4 space-y-4">{["Physics", "Chemistry", "Mathematics"].map((name) => { const row = stats.subjects.find((item) => item.subject === name) || { correct: 0, total: 0 }; return <div key={name}><div className="flex justify-between text-sm"><span className="font-bold text-[#46516c]">{name}</span><span className="text-xs text-[#73809b]">{row.total ? `${Math.round((row.correct / row.total) * 100)}% · ${row.correct}/${row.total}` : "No answers yet"}</span></div><div className="mt-2 h-1.5 rounded-full bg-[#edf0f6]"><div className="h-full rounded-full bg-[#7564ed]" style={{ width: `${row.total ? (row.correct / row.total) * 100 : 0}%` }} /></div></div>; })}</div></Card>
      <Card><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">TOPICS TO REVISIT</p>{stats.revisit.length ? <div className="mt-4 space-y-3">{stats.revisit.map((row) => <div key={row.subject + row.chapter} className="flex items-center justify-between gap-3 border-b border-[#edf0f5] pb-3 last:border-0 last:pb-0"><span className="text-sm font-bold text-[#46516c]">{row.chapter}<small className="block text-xs font-normal text-[#8994aa]">{row.subject}</small></span><span className="text-xs font-bold text-[#c7586d]">{Math.round((row.correct / row.total) * 100)}% · {row.correct}/{row.total}</span></div>)}</div> : <p className="mt-3 text-sm text-[#73809b]">Nothing to revisit. Every answer so far was correct.</p>}</Card>
    </div> : <Card><p className="text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">A NOTE ON YOUR DATA</p><h2 className="mt-2 text-xl font-extrabold text-[#27314c]">Your first insight starts with your first answer.</h2><p className="mt-2 text-sm leading-6 text-[#73809b]">Complete some daily practice, a study task or a test to reveal your accuracy, subject breakdown and topics to revisit. We only show insights based on your real answers.</p></Card>}
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
      <label className="text-xs font-bold text-[#46516b]">Subject<select value={pyqSubject} onChange={(event) => { setPyqSubject(event.target.value); setPyqChapter("all"); setPyqTopic("all"); }} className="mt-2 w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm font-normal"><option value="all">All subjects</option>{pyqSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
      <label className="text-xs font-bold text-[#46516b]">Chapter<select value={pyqChapter} onChange={(event) => { setPyqChapter(event.target.value); setPyqTopic("all"); }} className="mt-2 w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm font-normal"><option value="all">All chapters</option>{pyqChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}</select></label>
      <label className="text-xs font-bold text-[#46516b]">Topic<select value={pyqTopic} onChange={(event) => setPyqTopic(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe5ef] bg-[#fafbfe] p-3 text-sm font-normal"><option value="all">All topics</option>{pyqTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
    </div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f5] pt-4"><p className="text-xs text-[#73809b]"><strong className="text-[#27314c]">{filteredPyqs.length}</strong> sample question{filteredPyqs.length === 1 ? "" : "s"} match your selection.</p><span className="rounded-full bg-[#f0edff] px-3 py-1 text-[10px] font-extrabold tracking-wide text-[#6958d2]">JEE MAIN + ADVANCED</span></div></Card>
    <div className="space-y-3">{filteredPyqs.map((question, index) => { const selected = pyqAnswer[question.id]; const answered = selected !== undefined; return <Card key={question.id}>
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold tracking-wide text-[#8994aa]"><span className="rounded-full bg-[#f0edff] px-2.5 py-1 text-[#6958d2]">{question.subject}</span><span>{question.chapter} · {question.topic}</span><span className="ml-auto">{question.exam} · {question.year}</span></div>
      <p className="mt-4 text-sm font-bold leading-6 text-[#27314c]">{index + 1}. {question.text}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => <button key={option} type="button" disabled={answered} onClick={() => setPyqAnswer((current) => ({ ...current, [question.id]: optionIndex }))} className={`rounded-xl border p-3 text-left text-xs font-semibold transition ${answered && optionIndex === question.answer ? "border-[#66b99d] bg-[#e9f8f1] text-[#287e65]" : answered && optionIndex === selected ? "border-[#dc8792] bg-[#fff0f2] text-[#bd4a5a]" : "border-[#e4e8f1] text-[#46516b] hover:border-[#a89bea] hover:bg-[#faf9ff]"}`}><span className="mr-2 text-[#8994aa]">{String.fromCharCode(65 + optionIndex)}.</span>{option}</button>)}</div>
      {answered && <p className={`mt-4 rounded-xl p-3 text-xs leading-5 ${selected === question.answer ? "bg-[#e9f8f1] text-[#287e65]" : "bg-[#fff0f2] text-[#bd4a5a]"}`}><strong>{selected === question.answer ? "Correct. " : "Not quite. "}</strong>{question.explanation}</p>}
    </Card>; })}</div>
  </div>;

  const profileView = <div className="space-y-5">
    <div>
      <p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">MAKE THIS SPACE YOURS</p>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#18223c]">Your student profile</h1>
      <p className="mt-2 text-sm text-[#73809b]">A few details help shape a preparation plan that fits your real day.</p>
    </div>
    <Card className="max-w-[900px]">
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
          const { error } = await getSupabase().auth.updateUser({
            data: {
              name: profile.name,
              exams: profile.exams,
              student_profile: {
                targetExam: profile.target,
                examDate: profile.date,
                prepStage: profile.stage,
                dailyHours: profile.hours,
                strengths: profile.strengths,
                focus: profile.focus,
                goal: profile.goal,
              },
            },
          });
          if (error) setProfileMessage(error.message);
          else setProfileMessage("Preferences saved successfully.");
        }}>Save my preferences</Button>
        {profileMessage && <p role="status" className="text-xs font-bold text-[#2c967b]">{profileMessage}</p>}
      </div>
    </Card>
  </div>;

  const liveSessions = <div className="space-y-5"><div className="flex items-start justify-between"><div><p className="mb-2 text-[10px] font-extrabold tracking-[.18em] text-[#8993ac]">LEARN FROM STUDENTS WHO&apos;VE BEEN THERE</p><h1 className="text-3xl font-extrabold text-[#18223c]">Live sessions</h1><p className="mt-2 text-sm text-[#73809b]">Online conversations and Q&amp;A with students from IITs, NITs and IIITs are being planned.</p></div><span className="rounded-full bg-[#fff3dc] px-3 py-1.5 text-[10px] font-extrabold tracking-widest text-[#b67821]">IN PLANNING</span></div><Card className="max-w-2xl"><CircleHelp size={22} className="text-[#7564ed]" /><p className="mt-4 text-[10px] font-extrabold tracking-[.16em] text-[#8993ac]">COMING SOON</p><h2 className="mt-2 text-xl font-extrabold text-[#27314c]">Real experiences. Practical guidance.</h2><p className="mt-2 text-sm leading-6 text-[#73809b]">We&apos;re working towards live online sessions where current students from IITs, NITs and IIITs can share their experiences and answer your questions about preparation and campus life.</p><p className="mt-3 text-sm leading-6 text-[#73809b]">Session dates, speakers and joining details will be shared once confirmed.</p></Card></div>;
  const content = { overview, "study-plan": plan, practice, pyq: pyqView, "mock-tests": mockTests, challenge, "live-sessions": liveSessions, mistakes: mistakesView, progress, profile: profileView }[view] || overview;
  return <div className="dashboard-theme min-h-screen bg-[#f7f8fc]"><header className={`fixed top-0 z-30 flex h-16 w-full items-center border-b border-[#e4e8f1] bg-white/95 px-5 backdrop-blur ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"}`}><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#a897ff] to-[#6edcdb] font-extrabold text-[#1c2140]">J</span><span className="text-base font-extrabold tracking-tight text-[#1d2945]">JEE<span className="ml-0.5 block text-[8px] tracking-[.25em] text-[#808aa8]">COMPASS</span></span></div><nav aria-label="Main navigation" className="ml-4 hidden items-center gap-1 lg:flex"><Link href="/" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#64728d] hover:bg-[#f4f5fb]">Home</Link><Link href="/dashboard" className="rounded-lg bg-[#eef0ff] px-3 py-2 text-sm font-semibold text-[#263252]">My dashboard</Link><Link href="/about" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#64728d] hover:bg-[#f4f5fb]">About</Link><Link href="/features" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#64728d] hover:bg-[#f4f5fb]">Features</Link><Link href="/resources" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#64728d] hover:bg-[#f4f5fb]">Resources</Link><Link href="/faq" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#64728d] hover:bg-[#f4f5fb]">FAQ</Link></nav><div className="ml-auto flex items-center gap-2 lg:hidden"><NotificationBell ready={loaded} onOpenView={go} registered={registered} planTasks={planTasks} completed={completed} mistakes={mistakes} streak={stats.streak} todayCount={stats.todayCount} examDays={examDays} /><button onClick={() => setMenuOpen(true)} className="rounded-lg p-2" aria-label="Open navigation"><Menu size={22} /></button></div><div className="ml-auto hidden items-center gap-4 lg:flex"><span className="text-xs text-[#8994aa]">{new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span><ThemeToggle className="!rounded-lg !border-[#e4e8f1]" /><NotificationBell ready={loaded} onOpenView={go} registered={registered} planTasks={planTasks} completed={completed} mistakes={mistakes} streak={stats.streak} todayCount={stats.todayCount} examDays={examDays} /><button onClick={() => go("profile")} className="flex items-center gap-2 text-sm font-bold text-[#34405b]"><UserRound size={18} />{profile.name}</button></div><nav aria-label="Main navigation" className="fixed left-0 right-0 top-16 flex gap-1 overflow-x-auto border-b border-[#e4e8f1] bg-white px-5 py-2 lg:hidden"><Link href="/" className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-[#64728d]">Home</Link><Link href="/dashboard" className="shrink-0 rounded-lg bg-[#eef0ff] px-3 py-2 text-xs font-semibold text-[#263252]">My dashboard</Link><Link href="/about" className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-[#64728d]">About</Link><Link href="/features" className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-[#64728d]">Features</Link><Link href="/resources" className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-[#64728d]">Resources</Link><Link href="/faq" className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-[#64728d]">FAQ</Link></nav></header>  <aside className={`fixed inset-y-0 left-0 z-40 h-[100dvh] w-[min(18rem,calc(100vw-1rem))] max-w-full overflow-y-auto overscroll-contain border-r border-[#e4e8f1] bg-white px-4 pb-24 pt-24 transition-all lg:translate-x-0 ${sidebarCollapsed ? "lg:w-16" : "lg:w-64"} ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}><button onClick={() => setMenuOpen(false)} className="absolute right-4 top-5 lg:hidden" aria-label="Close navigation"><X /></button><button onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} className="absolute right-3 top-5 hidden rounded-lg p-2 text-[#6d7891] hover:bg-[#f0edff] lg:block" aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>{sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button><p className="px-3 text-[10px] font-extrabold tracking-[.18em] text-[#a0a8b9] lg:hidden">MAIN NAVIGATION</p><nav aria-label="Main navigation" className="mb-5 space-y-1 lg:hidden"><Link href="/" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-[#6d7891] hover:bg-[#f7f8fc]">Home</Link><Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block rounded-xl bg-[#eef0ff] px-3 py-2 text-sm font-semibold text-[#263252]">My dashboard</Link><Link href="/about" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-[#6d7891] hover:bg-[#f7f8fc]">About</Link><Link href="/features" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-[#6d7891] hover:bg-[#f7f8fc]">Features</Link><Link href="/resources" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-[#6d7891] hover:bg-[#f7f8fc]">Resources</Link><Link href="/faq" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-[#6d7891] hover:bg-[#f7f8fc]">FAQ</Link></nav><p className={`px-3 text-[10px] font-extrabold tracking-[.18em] text-[#a0a8b9] ${sidebarCollapsed ? "lg:hidden" : ""}`}>YOUR WORKSPACE</p>  <nav className={`mt-4 space-y-1 ${sidebarCollapsed ? "lg:mt-10" : ""}`}>{navItems.map(([id, label, Icon]) => <button key={id} onClick={() => go(id)} className={`flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold ${view === id ? "bg-[#f0edff] text-[#5e4bc1]" : "text-[#6d7891] hover:bg-[#f7f8fc]"}`}><Icon className="shrink-0" size={18} /><span className={`min-w-0 flex-1 ${sidebarCollapsed ? "lg:hidden" : ""}`}>{label}</span>{id === "live-sessions" ? <small className="shrink-0 whitespace-nowrap text-[9px] font-extrabold text-[#a0a8b9]">PLANNING</small> : null}</button>)}</nav><div className="absolute bottom-6 left-4 right-4 border-t border-[#edf0f5] pt-4"><button onClick={logOut} className="flex w-full items-center gap-3 px-3 py-2 text-sm font-bold text-[#7b879e] hover:text-[#bd5050]"><LogOut size={18} />Log out</button></div></aside>{menuOpen && <button aria-label="Close menu overlay" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-[#18223c]/20 lg:hidden" />}<main className={`min-h-screen pt-28 lg:pt-16 ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"}`}><div className="mx-auto max-w-[1180px] px-5 py-7 lg:mx-0 lg:max-w-none lg:px-8"><nav aria-label="Dashboard navigation" className="-mx-5 mb-5 flex gap-2 overflow-x-auto border-b border-[#e4e8f1] bg-white px-5 pb-3 lg:hidden">{navItems.map(([id, label, Icon]) => <button key={id} onClick={() => go(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${view === id ? "bg-[#f0edff] text-[#5e4bc1]" : "text-[#6d7891]"}`}><Icon size={15} />{label}</button>)}</nav><div className="mb-6 flex items-center justify-between"><p className="text-sm text-[#7c879e]">Your focused preparation workspace</p><span className="rounded-full bg-[#f0edff] px-3 py-1 text-xs font-bold text-[#6553c4]">{viewLabel}</span></div>{content}</div></main></div>;
}

export default function Dashboard() { return <DashboardApp />; }
