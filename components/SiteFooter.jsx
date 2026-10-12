import Link from "next/link";

const columns = [
  ["Product", [["Features", "/features"], ["Resources", "/resources"], ["FAQ", "/faq"]]],
  ["Company", [["About us", "/about"], ["Create account", "/signup"], ["Log in", "/login"]]],
];

export default function SiteFooter() {
  return <footer className="border-t border-[#dfe5ef] bg-white">
    <div className="mx-auto grid max-w-[1120px] gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
      <div>
        <Link href="/" className="text-lg font-extrabold tracking-tight text-[#263252]">JEE Preparation Platform</Link>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[#748099]">A daily plan, focused practice and honest analysis for JEE aspirants. Built by Pragmatiq Systems.</p>
      </div>
      {columns.map(([heading, links]) => <nav key={heading} aria-label={heading}>
        <h2 className="text-xs font-extrabold uppercase tracking-[.16em] text-[#8993ac]">{heading}</h2>
        <ul className="mt-4 space-y-3">{links.map(([label, href]) => <li key={label}><Link href={href} className="text-sm font-semibold text-[#556079] transition hover:text-[#5d52c7]">{label}</Link></li>)}</ul>
      </nav>)}
    </div>
    <div className="border-t border-[#edf0f5]"><div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-[#748099]"><span>© 2026 JEE Preparation Platform. All rights reserved.</span><span>An independent student-focused project. Not affiliated with NTA or any IIT.</span></div></div>
  </footer>;
}
