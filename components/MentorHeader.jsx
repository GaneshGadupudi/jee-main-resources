"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Video, PenTool, LogOut, Sun, Moon, Award } from "lucide-react";
import { useTheme } from "@/components/ThemeToggle";

export default function MentorHeader({ currentTab = "video", onSelectTab = null }) {
  const router = useRouter();
  const [dark, setDark] = useTheme();
  const [mentorUser, setMentorUser] = useState(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setMentorUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    } finally {
      window.location.href = "/login";
    }
  };

  const isTabActive = (tabName) => {
    if (tabName === "video") return currentTab === "video" || currentTab === "sessions";
    if (tabName === "written") return currentTab === "written" || currentTab === "written-solutions";
    return currentTab === tabName;
  };

  const navItemClass = (tabName) => {
    const active = isTabActive(tabName);
    return `flex items-center gap-1.5 sm:gap-2 rounded-xl px-2.5 sm:px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
      active
        ? "bg-[#6366f1] text-white shadow-sm"
        : "text-[#46516b] hover:bg-[#f0f3fa] hover:text-[#18223c]"
    }`;
  };

  const handleNavClick = (tabName, e) => {
    if (onSelectTab) {
      e.preventDefault();
      onSelectTab(tabName);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("section", tabName);
        window.history.pushState({}, "", url.toString());
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#dfe5ef] bg-white backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 lg:px-8">
        {/* Left: Brand & Mentor Navigation */}
        <div className="flex items-center gap-2 sm:gap-5 min-w-0">
          <Link href="/mentor/dashboard" className="flex items-center gap-2 shrink-0">
            <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6366f1] to-[#8b5cf6] text-white font-extrabold text-sm sm:text-base shadow-sm">
              J
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-extrabold tracking-tight text-[#18223c] hidden min-[480px]:inline">
                JEE Compass
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#f0edff] px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-[#6366f1] border border-[#dcd8fb]">
                <Award size={10} />
                MENTOR
              </span>
            </div>
          </Link>

          {/* Navigation: 1-on-1 Sessions and Written Solutions */}
          <nav className="flex items-center gap-1 sm:gap-1.5 border-l border-[#dfe5ef] pl-2 sm:pl-4 overflow-x-auto no-scrollbar">
            <Link
              href="/mentor/dashboard?section=video"
              onClick={(e) => handleNavClick("video", e)}
              className={navItemClass("video")}
              title="1-on-1 Doubt Sessions"
            >
              <Video size={14} className="sm:size-[15px]" />
              <span className="hidden sm:inline">1-on-1 Sessions</span>
              <span className="sm:hidden">1-on-1</span>
            </Link>

            <Link
              href="/mentor/dashboard?section=written"
              onClick={(e) => handleNavClick("written", e)}
              className={navItemClass("written")}
              title="Written Solutions"
            >
              <PenTool size={14} className="sm:size-[15px]" />
              <span className="hidden sm:inline">Written Solutions</span>
              <span className="sm:hidden">Written</span>
            </Link>
          </nav>
        </div>

        {/* Right: Theme Toggle, Mentor Identity, Logout */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={() => setDark(!dark)}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-[#dfe5ef] bg-[#fafbfe] text-[#46516b] hover:bg-[#f0f3fa] hover:text-[#18223c] transition-all shadow-sm"
          >
            {dark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
          </button>

          {/* Mentor Identity Pill (tablet / desktop) */}
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-[#18223c] max-w-[140px] truncate">
              {mentorUser?.name || "Mentor"}
            </span>
            <span className="text-[11px] text-[#73809b] max-w-[140px] truncate">
              {mentorUser?.email || "mentor@jeecompass.in"}
            </span>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            title="Log Out"
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-[#dfe5ef] bg-[#fafbfe] text-[#73809b] hover:border-[#dc8792] hover:bg-[#fff0f2] hover:text-[#bd4a5a] transition-all shadow-sm"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
