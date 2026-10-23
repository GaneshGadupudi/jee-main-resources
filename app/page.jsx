import { BarChart3, CalendarCheck, Flame, NotebookPen, PencilLine, Timer, TrendingUp, Trophy, GraduationCap, Video } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AuthSwitch from "@/components/AuthSwitch";
import { ButtonLink, Eyebrow, IconBadge, SectionHeading } from "@/components/ui";

const features = [
  [CalendarCheck, "Personal study plan", "Daily tasks based on your days left, weak chapters and study hours."],
  [PencilLine, "Problems of the Day", "Physics, Chemistry and Maths questions with instant explanations."],
  [Timer, "Mock tests", "Timed tests with a question palette and detailed analysis."],
  [Trophy, "Weekly challenge", "One common test every weekend, with a detailed score report."],
  [NotebookPen, "Mistake book", "Save wrong answers, tag the reason and revise them later."],
  [Flame, "Streaks and progress", "Track consistency, syllabus completion and improvement over time."],
];

const steps = [
  [CalendarCheck, "Plan", "A study plan built around your exam date"],
  [PencilLine, "Practice", "Focused questions every day"],
  [Timer, "Test", "Mock tests and a weekly challenge"],
  [BarChart3, "Analyze", "See weak topics and mistake patterns"],
  [TrendingUp, "Improve", "Next week's plan adjusts to your results"],
];

export default function HomePage() {
  return (
    <>
      <SiteHeader active="Home" />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gradient-to-br from-[#eef0ff] to-white blur-2xl"
          />
          <div className="relative mx-auto grid max-w-[1120px] items-center gap-12 px-5 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <Eyebrow className="inline-flex rounded-full border border-[#dcd8fb] bg-[#f4f3ff] px-3 py-1.5 tracking-[.14em]">
                For JEE Main and Advanced aspirants
              </Eyebrow>
              <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-[#18223c] sm:text-6xl">
                Know what to study today.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#69758d]">
                JEE Preparation Platform turns your exam date, syllabus and mistakes into a daily plan, then shows you whether you are really improving.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <AuthSwitch
                  guest={
                    <ButtonLink href="/signup" size="lg" arrow>
                      Create free account
                    </ButtonLink>
                  }
                  member={
                    <ButtonLink href="/dashboard" size="lg" arrow>
                      Go to my dashboard
                    </ButtonLink>
                  }
                />
                <ButtonLink href="/features" variant="secondary" size="lg">
                  See features
                </ButtonLink>
                <ButtonLink href="/mentor/register" variant="secondary" size="lg">
                  Register as a Mentor
                </ButtonLink>
              </div>
            </div>
            <ol aria-label="How JEE Preparation Platform works" className="space-y-3">
              {steps.map(([icon, title, text], index) => (
                <li
                  key={title}
                  className={`flex items-center gap-4 rounded-2xl border border-[#e0e5ef] bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    index % 2 ? "lg:ml-9" : "lg:mr-9"
                  }`}
                >
                  <IconBadge icon={icon} size="sm" />
                  <span className="font-extrabold text-[#34405b]">
                    {title}
                    <small className="block font-medium text-[#7c879e]">{text}</small>
                  </span>
                  <span aria-hidden="true" className="ml-auto text-xs font-extrabold text-[#b4bbd0]">
                    0{index + 1}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-y border-[#e0e5ef] bg-white py-20">
          <div className="mx-auto max-w-[1120px] px-5">
            <SectionHeading
              center
              eyebrow="Features"
              title="Everything for daily preparation"
              intro="Built for one question: am I preparing well today?"
            />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(([icon, title, text]) => (
                <article
                  key={title}
                  className="rounded-2xl border border-[#e0e5ef] bg-[#f9faff] p-6 transition duration-200 hover:-translate-y-0.5 hover:border-[#c9c6f5] hover:shadow-lg hover:shadow-indigo-100"
                >
                  <IconBadge icon={icon} />
                  <h3 className="mt-5 text-lg font-extrabold text-[#303b53]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#718098]">{text}</p>
                </article>
              ))}
            </div>
            <p className="mt-10 text-center">
              <ButtonLink href="/features" variant="secondary" arrow>
                Explore all features
              </ButtonLink>
            </p>
          </div>
        </section>

        {/* Dedicated "Register as a Mentor" Banner Section */}
        <section className="bg-gradient-to-r from-[#fbfaff] via-white to-[#f5f2ff] py-16 border-b border-[#e0e5ef]">
          <div className="mx-auto max-w-[1120px] px-5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 rounded-3xl border border-[#dcd8fb] bg-white p-8 sm:p-12 shadow-sm">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#dcd8fb] bg-[#f4f3ff] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#6353c6]">
                  <GraduationCap size={13} /> Mentorship Network
                </div>
                <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#18223c]">
                  Guide the next generation of JEE toppers
                </h2>
                <p className="mt-3 text-base text-[#69758d] leading-relaxed">
                  Are you an IITian, NITian, or passionate educator? Join our network of verified mentors. Conduct live 1-on-1 doubt clearing video sessions, share tactical problem-solving methods, and earn while empowering aspirants.
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-[#46516c]">
                  <span className="flex items-center gap-1.5 text-[#2c967b]">
                    ✓ Flexible 1-on-1 video sessions
                  </span>
                  <span className="flex items-center gap-1.5 text-[#2c967b]">
                    ✓ Built-in interactive whiteboard
                  </span>
                  <span className="flex items-center gap-1.5 text-[#2c967b]">
                    ✓ Official verified mentor credential
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <ButtonLink href="/mentor/register" size="lg" arrow>
                  Register as a Mentor
                </ButtonLink>
                <ButtonLink href="/mentor/application-status" variant="secondary" size="lg">
                  Check Status
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        {/* Resources Section */}
        <section className="py-20">
          <div className="mx-auto grid max-w-[1120px] items-center gap-10 px-5 lg:grid-cols-2">
            <div>
              <Eyebrow>Resources</Eyebrow>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#202944]">
                Free chapter-wise notes
              </h2>
              <p className="mt-4 max-w-lg text-lg leading-8 text-[#69758d]">
                Short revision notes for Physics, Chemistry and Mathematics, available once you log in.
              </p>
              <ButtonLink href="/resources" className="mt-6" arrow>
                Open resources
              </ButtonLink>
            </div>
            <div className="rounded-2xl border border-[#e0e5ef] bg-white p-6 shadow-sm">
              <span className="rounded-full bg-[#eef0ff] px-3 py-1 text-xs font-bold text-[#5d52c7]">
                Inside your dashboard
              </span>
              <h3 className="mt-4 text-xl font-extrabold text-[#303b53]">
                Mock tests, challenges and analytics
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#718098]">
                Timed mock tests, a weekly challenge and progress insights are ready to use. Create an account to start your first one.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="pb-20">
          <div className="mx-auto max-w-[1120px] px-5">
            <div className="rounded-3xl border border-[#e2e0fb] bg-gradient-to-br from-[#eef0ff] to-white p-10 text-center sm:p-14">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#29274e]">
                Start your preparation the right way
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-lg text-[#69758d]">
                Sign up in under a minute with email or Google.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <AuthSwitch
                  guest={
                    <>
                      <ButtonLink href="/signup" size="lg" arrow>
                        Sign up free
                      </ButtonLink>
                      <ButtonLink href="/login" variant="secondary" size="lg">
                        I already have an account
                      </ButtonLink>
                    </>
                  }
                  member={
                    <ButtonLink href="/dashboard" size="lg" arrow>
                      Continue to my dashboard
                    </ButtonLink>
                  }
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
