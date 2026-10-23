"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useEffect, useState } from "react";

export default function SiteHeader({ active = "" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const links = [
    ["Home", "/"],
    ["About", "/about"],
    ["Features", "/features"],
    ["Resources", "/resources"],
    ["FAQ", "/faq"],
  ];

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => {
        setUser(data.user || null);
        setAuthReady(true);
      })
      .catch(() => {
        setUser(null);
        setAuthReady(true);
      });
  }, []);

  const logOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };
  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  const getDashboardHref = () => {
    if (!user) return "/dashboard";
    if (user.role === "admin") return "/admin/dashboard";
    if (user.role === "mentor") return "/mentor/dashboard";
    return "/dashboard";
  };

  const getDashboardLabel = () => {
    if (!user) return "My dashboard";
    if (user.role === "admin") return "Admin Panel";
    if (user.role === "mentor") return "Mentor Desk";
    return "My dashboard";
  };

  const isDashboardActive = () => {
    if (!user) return false;
    if (user.role === "admin") return active === "Admin Panel";
    if (user.role === "mentor") return active === "Mentor Desk";
    return active === "My dashboard";
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#dfe5ef] bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-[1120px] flex-wrap items-center gap-3 px-4 sm:px-5">
        <Link
          href="/"
          className="mr-auto max-w-[calc(100%-52px)] whitespace-normal text-base font-extrabold leading-tight tracking-tight text-[#17213b] sm:text-lg"
        >
          JEE Preparation Platform
        </Link>
        <nav
          className={`${
            menuOpen
              ? "absolute left-0 right-0 top-16 flex border-b border-[#dfe5ef] bg-white p-4 shadow-lg"
              : "hidden"
          } z-40 flex-col gap-1 lg:static lg:flex lg:flex-row lg:items-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
        >
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              active === "Home" ? "bg-[#eef0ff] text-[#263252]" : "text-[#64728d] hover:bg-[#f4f5fb]"
            }`}
          >
            Home
          </Link>
          {authReady && user && (
            <Link
              href={getDashboardHref()}
              onClick={() => setMenuOpen(false)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                isDashboardActive() ? "bg-[#eef0ff] text-[#263252]" : "text-[#64728d] hover:bg-[#f4f5fb]"
              }`}
            >
              {getDashboardLabel()}
            </Link>
          )}
          {links.slice(1).map(([label, href]) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                active === label ? "bg-[#eef0ff] text-[#263252]" : "text-[#64728d] hover:bg-[#f4f5fb]"
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/mentor/register"
            onClick={() => setMenuOpen(false)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              active === "Become a Mentor"
                ? "bg-[#eef0ff] text-[#263252]"
                : "text-[#7564ed] hover:bg-[#f4f3ff]"
            }`}
          >
            Become a Mentor
          </Link>
          <div className="mt-2 flex flex-wrap gap-2 border-t border-[#edf0f5] pt-3 lg:hidden">
            <ThemeToggle />
            {authReady &&
              (user ? (
                <button
                  onClick={logOut}
                  className="rounded-xl border border-[#dfe5ef] px-4 py-2 text-sm font-bold text-[#34405b]"
                >
                  Log out
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl border border-[#dfe5ef] px-4 py-2 text-sm font-bold text-[#34405b]"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl bg-[#6366f1] px-4 py-2 text-sm font-bold text-white"
                  >
                    Sign up
                  </Link>
                </>
              ))}
          </div>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {authReady &&
            (user ? (
              <>
                <span className="text-sm font-semibold text-[#46516c]">Welcome, {firstName}</span>
                <button
                  onClick={logOut}
                  className="rounded-xl border border-[#dfe5ef] px-4 py-2 text-sm font-bold text-[#34405b]"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl border border-[#dfe5ef] px-4 py-2 text-sm font-bold text-[#34405b]"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl bg-[#6366f1] px-4 py-2 text-sm font-bold text-white"
                >
                  Sign up
                </Link>
              </>
            ))}
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
          className="rounded-xl border border-[#dfe5ef] p-2 text-[#40506e] lg:hidden"
        >
          <Menu size={18} />
        </button>
      </div>
    </header>
  );
}
