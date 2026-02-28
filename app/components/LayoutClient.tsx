"use client";

import { useState, useEffect } from "react";
import SiteHeader from "./SiteHeader";
import type { BlueskySession } from "@/lib/types";

interface LayoutClientProps {
  children: React.ReactNode;
}

export default function LayoutClient({ children }: LayoutClientProps) {
  const [session, setSession] = useState<BlueskySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <SiteHeader session={session} onLogout={handleLogout} />
      <main className="relative mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 pb-20 pt-28 sm:px-10">
        {children}
      </main>
    </div>
  );
}
