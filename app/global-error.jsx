"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body className="grid min-h-screen place-items-center bg-[#f7f8fc] p-6 text-center">
        <section className="w-full max-w-md rounded-2xl border border-[#e4e8f1] bg-white p-8 shadow-sm">
          <p className="text-4xl font-extrabold text-[#c7586d]">Oops</p>
          <h1 className="mt-3 text-2xl font-extrabold text-[#18223c]">Application Error</h1>
          <p className="mt-2 text-sm text-[#73809b]">
            {error?.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex rounded-xl bg-[#6366f1] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#5254db] transition"
          >
            Try Again
          </button>
        </section>
      </body>
    </html>
  );
}

