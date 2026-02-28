"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import SiteHeader from "./SiteHeader";
import type { BlueskySession } from "@/lib/types";

interface LayoutClientProps {
  children: React.ReactNode;
}

type ThemeMode = "light" | "dark";
const THEME_STORAGE_KEY = "library-sky-theme";

function getSessionSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("library-sky-session");
}

function getServerSessionSnapshot(): string | null {
  return null;
}

function subscribeToSession(callback: () => void) {
  window.addEventListener("library-sky-session-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("library-sky-session-change", callback);
    window.removeEventListener("storage", callback);
  };
}

function parseSession(sessionString: string | null): BlueskySession | null {
  if (!sessionString) return null;
  try {
    return JSON.parse(sessionString) as BlueskySession;
  } catch {
    return null;
  }
}

export default function LayoutClient({ children }: LayoutClientProps) {
  const sessionString = useSyncExternalStore(subscribeToSession, getSessionSnapshot, getServerSessionSnapshot);
  const session = parseSession(sessionString);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return storedTheme === "dark" || (!storedTheme && prefersDark) ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleLogout = () => {
    localStorage.removeItem("library-sky-session");
    window.dispatchEvent(new Event("library-sky-session-change"));
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };


  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <SiteHeader
        session={session}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="relative mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 pb-20 pt-28 sm:px-10">
        {children}
      </main>
    </div>
  );
}
