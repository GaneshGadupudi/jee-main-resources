"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Users, BookOpen, LogOut, Sun, Moon, ShieldCheck } from "lucide-react";
import { useTheme } from "@/components/ThemeToggle";

export default function AdminHeader({ currentTab = "mentor-applications" }) {
  const router = useRouter();
  const [dark, setDark] = useTheme();
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setAdminUser(data.user);
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

  const navItemClass = (tabName) => {
    const isActive = currentTab === tabName;
    return `flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
      isActive
        ? "bg-[#6366f1] text-white shadow-sm"
        : "text-[#46516b] hover:bg-[#f0f3fa] hover:text-[#18223c]"
    }`;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#dfe5ef] bg-white backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Brand & Admin Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6366f1] to-[#8b5cf6] text-white font-extrabold text-base shadow-sm">
              J
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-sm font-extrabold tracking-tight text-[#18223c]">
                JEE Compass
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#f0edff] px-2 py-0.5 text-[10px] font-bold text-[#6366f1] border border-[#dcd8fb]">
                <ShieldCheck size={11} />
                ADMIN
              </span>
            </div>
          </Link>

          {/* Navigation with ONLY Mentor Applications and PYQ Review */}
          <nav className="flex items-center gap-1.5 border-l border-[#dfe5ef] pl-4 sm:pl-6">
            <Link
              href="/admin/dashboard"
              className={navItemClass("mentor-applications")}
            >
              <Users size={15} />
              <span>Mentor Applications</span>
            </Link>

            <Link
              href="/admin/pyq"
              className={navItemClass("pyq")}
            >
              <BookOpen size={15} />
              <span>PYQ Review</span>
            </Link>
          </nav>
        </div>

        {/* Right: Theme Toggle, Admin Identity, Logout */}
        <div className="flex items-center gap-3">
          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={() => setDark(!dark)}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#dfe5ef] bg-[#fafbfe] text-[#46516b] hover:bg-[#f0f3fa] hover:text-[#18223c] transition-all shadow-sm"
          >
            {dark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
          </button>

          {/* Admin Identity Pill */}
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-[#18223c]">
              {adminUser?.name || "Administrator"}
            </span>
            <span className="text-[11px] text-[#73809b]">
              {adminUser?.email || "admin@jeecompass.com"}
            </span>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            title="Log Out"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#dfe5ef] bg-[#fafbfe] text-[#73809b] hover:border-[#dc8792] hover:bg-[#fff0f2] hover:text-[#bd4a5a] transition-all shadow-sm"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

