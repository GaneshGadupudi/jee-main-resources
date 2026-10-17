"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { api } from "@/lib/client-api";

const STORAGE_KEY = "jee-theme";
const EVENT = "jee-theme-change";

// The account setting is the source of truth. The copy in localStorage only exists so layout.jsx can paint the right theme before the page loads.
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* storage is optional */ }
  window.dispatchEvent(new Event(EVENT));
}

// The theme lives on <html data-theme>; layout.jsx sets it before first paint so there is no flash and no per-page reset.
const subscribe = (callback) => { window.addEventListener(EVENT, callback); return () => window.removeEventListener(EVENT, callback); };
const getSnapshot = () => document.documentElement.dataset.theme === "dark";

export function useTheme() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const setDark = (next) => {
    applyTheme(next ? "dark" : "light");
    api("PUT", "/api/me/settings", { theme: next ? "dark" : "light" }); // ignored (401) when nobody is logged in
  };
  return [dark, setDark];
}

export default function ThemeToggle({ className = "" }) {
  const [dark, setDark] = useTheme();
  return <button type="button" onClick={() => setDark(!dark)} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Switch to light mode" : "Switch to dark mode"} className={`rounded-xl border border-[#dfe5ef] bg-white p-2 text-[#40506e] ${className}`}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>;
}
