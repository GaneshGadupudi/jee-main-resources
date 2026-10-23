"use client";

import { useEffect } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error("App boundary error caught:", error);
  }, [error]);

  return (
    <>
      <SiteHeader />
      <main className="grid min-h-[calc(100vh-140px)] place-items-center bg-[#f7f8fc] p-6 text-center">
        <section className="w-full max-w-md rounded-2xl border border-[#e4e8f1] bg-white p-8 shadow-sm">
          <p className="text-4xl font-extrabold text-[#c7586d]">Oops</p>
          <h1 className="mt-3 text-2xl font-extrabold text-[#18223c]">Something went wrong</h1>
          <p className="mt-2 text-sm text-[#73809b]">
            {error?.message || "An unexpected error occurred while loading this page."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex rounded-xl bg-[#6366f1] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#5254db] transition"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex rounded-xl border border-[#dfe5ef] bg-white px-5 py-2.5 text-sm font-bold text-[#46516c] hover:bg-[#f7f8fc] transition"
            >
              Return Home
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

