import { BarChart3, Bot, CalendarCheck, Flame, Hourglass, Library, Medal, NotebookPen, PencilLine, RefreshCw, Timer, Trophy, Video } from "lucide-react";
import ContentPage, { Card } from "@/components/ContentPage";
import { IconBadge, SectionHeading } from "@/components/ui";

const features = [
  [CalendarCheck, "Personal study plan", "Built from your exam date, syllabus progress, weak chapters and daily study hours."],
  [Hourglass, "Exam countdown", "See exactly how many days are left for your target exam."],
  [PencilLine, "Problems of the Day", "Daily questions across Physics, Chemistry and Maths, each with an explanation."],
  [Timer, "Mock tests", "Timer, question palette, mark for review and automatic scoring."],
  [Trophy, "Weekly challenge", "A timed weekend contest with a detailed score report and full solution review."],
  [NotebookPen, "Mistake book", "Save wrong answers and tag the reason for the mistake."],
  [BarChart3, "Performance analytics", "Find weak topics and see whether you are improving over time."],
  [Flame, "Streaks and achievements", "Rewards for real preparation, not just opening the app."],
  [Library, "Resource library", "Chapter-wise short notes for Physics, Chemistry and Maths."],
];

const later = [
  [Medal, "Rank and percentile", "A weekend leaderboard once enough students take the same contest."],
  [Video, "Live sessions", "Q&A with students from IITs, NITs and IIITs."],
  [Bot, "AI tutor and mentors", "Hints on a question and help from a mentor when you are stuck."],
  [RefreshCw, "Sync across devices", "Keep your progress on every device you study on."],
];

export default function FeaturesPage() {
  return <ContentPage eyebrow="Features" title="Features" intro="One loop: plan, practice, test, analyze, improve. Here is what each part does." wide>
    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{features.map(([icon, heading, text]) => <Card key={heading} interactive><IconBadge icon={icon} /><h2 className="mt-5 text-lg font-extrabold text-[#303b53]">{heading}</h2><p className="mt-2 text-sm leading-6 text-[#718098]">{text}</p></Card>)}</div>
    <div className="mt-16"><SectionHeading eyebrow="Roadmap" title="Coming later" intro="These come after the core experience is stable." /></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{later.map(([icon, heading, text]) => <div key={heading} className="rounded-2xl border border-dashed border-[#cfd5e6] bg-[#f9faff] p-5"><div className="flex items-center justify-between"><IconBadge icon={icon} size="sm" /><span className="rounded-full bg-[#f1f3f8] px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide text-[#7c879e]">PLANNED</span></div><h3 className="mt-4 font-extrabold text-[#303b53]">{heading}</h3><p className="mt-1.5 text-sm leading-6 text-[#718098]">{text}</p></div>)}</div>
  </ContentPage>;
}
