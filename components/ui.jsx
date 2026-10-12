import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Small shared pieces for the public pages (home, about, features, FAQ) so spacing, buttons and icons stay consistent.

const buttonBase = "group inline-flex items-center justify-center gap-2 rounded-xl font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c7c2f7]";
const buttonSizes = { md: "px-5 py-3 text-sm sm:text-base", lg: "px-6 py-3.5 text-base" };
const buttonVariants = {
  primary: "bg-[#6366f1] text-white shadow-lg shadow-indigo-200 hover:-translate-y-0.5 hover:bg-[#575ae6]",
  secondary: "border border-[#dfe5ef] bg-white text-[#34405b] shadow-sm hover:-translate-y-0.5 hover:border-[#c9c6f5] hover:bg-[#f7f6ff]",
};

export function ButtonLink({ href, children, variant = "primary", size = "md", arrow = false, className = "", ...props }) {
  return <Link href={href} className={`${buttonBase} ${buttonSizes[size]} ${buttonVariants[variant]} ${className}`} {...props}>{children}{arrow && <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />}</Link>;
}

export function IconBadge({ icon: Icon, size = "md", className = "" }) {
  const box = size === "sm" ? "h-10 w-10 rounded-full" : "h-11 w-11 rounded-xl";
  return <span aria-hidden="true" className={`grid shrink-0 place-items-center bg-[#eef0ff] text-[#5d52c7] ${box} ${className}`}><Icon size={size === "sm" ? 18 : 20} strokeWidth={2} /></span>;
}

export function Eyebrow({ children, className = "" }) {
  return <p className={`text-xs font-extrabold uppercase tracking-[.18em] text-[#6358c9] ${className}`}>{children}</p>;
}

export function SectionHeading({ eyebrow, title, intro, center = false }) {
  return <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
    <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#202944]">{title}</h2>
    {intro && <p className="mt-3 text-lg leading-8 text-[#69758d]">{intro}</p>}
  </div>;
}
