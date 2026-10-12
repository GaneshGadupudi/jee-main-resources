import { BadgeCheck, GraduationCap, Heart, Linkedin, Target } from "lucide-react";
import ContentPage, { Card } from "@/components/ContentPage";
import AuthSwitch from "@/components/AuthSwitch";
import { ButtonLink, IconBadge, SectionHeading } from "@/components/ui";

const team = [
  ["Gadupudi Ganesh Sai", "GG", "https://www.linkedin.com/in/gadupudiganesh/"],
];

const values = [
  [GraduationCap, "Student first", "Every feature must help a student prepare better today."],
  [Target, "Transparent", "Recommendations follow clear rules you can understand."],
  [BadgeCheck, "Verified content", "Questions are reviewed by a human before students see them."],
  [Heart, "Consistency over rank", "Competition should motivate you, not define you."],
];

export default function AboutPage() {
  return <ContentPage eyebrow="About" title="About us" intro="The JEE Preparation Platform is built by Pragmatiq Systems. It started as a free collection of short notes, and it is growing into a daily preparation companion for JEE aspirants.">
    <div className="mt-12"><SectionHeading title="Meet the team" /></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">{team.map(([name, initials, link]) => <Card key={name} interactive>
      <div className="flex items-center gap-4"><span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#eef0ff] text-sm font-extrabold text-[#5d52c7]">{initials}</span><div><h3 className="text-lg font-extrabold text-[#303b53]">{name}</h3><p className="text-sm text-[#718098]">Developer, Pragmatiq Systems</p></div></div>
      <a className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#5d52c7] hover:underline" href={link} target="_blank" rel="noreferrer"><Linkedin size={16} />View LinkedIn profile<span className="sr-only"> (opens in a new tab)</span></a>
    </Card>)}</div>

    <div className="mt-14"><SectionHeading title="How we work" /></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">{values.map(([icon, heading, text]) => <Card key={heading} interactive><IconBadge icon={icon} /><h3 className="mt-4 font-extrabold text-[#303b53]">{heading}</h3><p className="mt-2 text-sm leading-6 text-[#718098]">{text}</p></Card>)}</div>

    <div className="mt-14 rounded-3xl border border-[#e2e0fb] bg-gradient-to-br from-[#eef0ff] to-white p-8 text-center sm:p-10">
      <h2 className="text-2xl font-extrabold tracking-tight text-[#29274e]">Ready to prepare with a plan?</h2>
      <p className="mt-2 text-[#69758d]">Join the students building a consistent daily routine.</p>
      <div className="mt-6 flex justify-center"><AuthSwitch guest={<ButtonLink href="/signup" arrow>Create free account</ButtonLink>} member={<ButtonLink href="/dashboard" arrow>Go to my dashboard</ButtonLink>} /></div>
    </div>
  </ContentPage>;
}
