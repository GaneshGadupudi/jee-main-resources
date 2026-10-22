"use client";

import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="grid min-h-[calc(100vh-140px)] place-items-center bg-[#f7f8fc] p-6 text-center">
        <section className="w-full max-w-md rounded-2xl border border-[#e4e8f1] bg-white p-8 shadow-sm">
          <p className="text-4xl font-extrabold text-[#7564ed]">404</p>
          <h1 className="mt-3 text-2xl font-extrabold text-[#18223c]">Page Not Found</h1>
          <p className="mt-2 text-sm text-[#73809b]">
            The page you are looking for doesn&apos;t exist or has been moved.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-[#6366f1] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#5254db] transition"
          >
            Return Home
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

