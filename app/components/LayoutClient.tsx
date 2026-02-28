"use client";

import { useState, useEffect } from "react";
import SiteHeader from "./SiteHeader";
import type { BlueskySession } from "@/lib/types";

interface LayoutClientProps {
  children: React.ReactNode;
}

type ThemeMode = "light" | "dark";
const THEME_STORAGE_KEY = "library-sky-theme";

export default function LayoutClient({ children }: LayoutClientProps) {
  const [session, setSession] = useState<BlueskySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme: ThemeMode =
      storedTheme === "dark" ||
        (!storedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? "dark"
        : "light";

    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");

    const loadSession = () => {
      const stored = localStorage.getItem("library-sky-session");
      if (stored) {
        try {
          const parsedSession = JSON.parse(stored) as BlueskySession;
          setSession(parsedSession);
        } catch {
          localStorage.removeItem("library-sky-session");
          setSession(null);
        }
      } else {
        setSession(null);
      }
      setIsLoading(false);
    };

    loadSession();

    // Listen for custom session change events
    const handleSessionChange = () => {
      const stored = localStorage.getItem("library-sky-session");
      if (stored) {
        try {
          const parsedSession = JSON.parse(stored) as BlueskySession;
          setSession(parsedSession);
        } catch {
          setSession(null);
        }
      } else {
        setSession(null);
      }
    };

    window.addEventListener("library-sky-session-change", handleSessionChange);

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "library-sky-session") {
        if (e.newValue) {
          try {
            const parsedSession = JSON.parse(e.newValue) as BlueskySession;
            setSession(parsedSession);
          } catch {
            setSession(null);
          }
        } else {
          setSession(null);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("library-sky-session-change", handleSessionChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("library-sky-session");
    setSession(null);
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  if (isLoading) {
    return null;
  }

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
