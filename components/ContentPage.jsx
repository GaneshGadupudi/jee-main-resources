import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Eyebrow } from "@/components/ui";

export default function ContentPage({ title, intro, eyebrow, children, wide = false }) {
  return <><SiteHeader active={title} /><main className="py-16"><div className={`mx-auto px-5 ${wide ? "max-w-[1120px]" : "max-w-[760px]"}`}>{eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}<h1 className="text-4xl font-extrabold tracking-tight text-[#18223c]">{title}</h1>{intro && <p className="mt-4 text-lg leading-8 text-[#69758d]">{intro}</p>}{children}</div></main><SiteFooter /></>;
}

export function Card({ children, className = "", interactive = false }) {
  return <article className={`rounded-2xl border border-[#e0e5ef] bg-white p-6 ${interactive ? "transition duration-200 hover:-translate-y-0.5 hover:border-[#c9c6f5] hover:shadow-lg hover:shadow-indigo-100" : ""} ${className}`}>{children}</article>;
}
