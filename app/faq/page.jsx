import { ChevronDown } from "lucide-react";
import ContentPage from "@/components/ContentPage";

const faqs = [["What is JEE Preparation Platform?", "A preparation platform that gives you a daily plan, daily practice, mock tests and analysis, so you always know what to work on next."], ["Is it free?", "Creating an account and using the notes is free. Pricing for future features has not been decided."], ["Which exams does it support?", "JEE Main and JEE Advanced first. Support for other exams may come later."], ["Why do I need to log in for Resources?", "Logging in lets us keep your progress safe and improve the platform for active students."], ["Are short notes enough to prepare?", "No. Notes are for revision. You still need to learn concepts and practise questions."], ["How is the study plan made?", "From your exam date, remaining syllabus, weak chapters and daily study hours. It adjusts gradually after your tests."], ["Are the questions reliable?", "Questions are checked by a person before they are published."], ["Is my data safe?", "Your account is protected by login, and each student can only access their own data."], ["Is the platform affiliated with NTA or the IITs?", "No. It is independent. Confirm exam dates, syllabus and rules on official JEE websites."]];

export default function FAQPage() {
  return <ContentPage eyebrow="FAQ" title="Frequently asked questions" intro="Quick answers about how the platform works. Can't find yours? Check the About page to reach the team.">
    <div className="mt-10 space-y-3">{faqs.map(([question, answer], index) => <details key={question} open={index === 0} className="group rounded-2xl border border-[#dfe5ef] bg-white transition duration-200 open:border-[#c9c6f5] open:shadow-md open:shadow-indigo-100 hover:border-[#c9c6f5]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl p-5 font-bold text-[#34405b] marker:hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c7c2f7] [&::-webkit-details-marker]:hidden"><span>{question}</span><ChevronDown size={18} aria-hidden="true" className="shrink-0 text-[#8993ac] transition-transform duration-200 group-open:rotate-180" /></summary>
      <p className="px-5 pb-5 text-sm leading-7 text-[#718098]">{answer}</p>
    </details>)}</div>
  </ContentPage>;
}
