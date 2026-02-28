"use client";

import { useState, useEffect } from "react";
import HomeClient from "./components/HomeClient";
import type { BlueskySession } from "@/lib/types";

function isValidSession(session: unknown): session is BlueskySession {
  if (!session || typeof session !== "object") {
    return false;
  }
  const value = session as Partial<BlueskySession>;
  return Boolean(
    value.handle &&
    value.did &&
    value.accessJwt &&
    value.refreshJwt &&
    value.service
  );
}

export default function Home() {
  const [session, setSession] = useState<BlueskySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("library-sky-session");
    if (stored) {
      try {
        const parsedSession = JSON.parse(stored);
        if (isValidSession(parsedSession)) {
          setSession(parsedSession);
        } else {
          localStorage.removeItem("library-sky-session");
          setSession(null);
        }
      } catch {
        localStorage.removeItem("library-sky-session");
        setSession(null);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleSessionChangeEvent = () => {
      const stored = localStorage.getItem("library-sky-session");
      if (stored) {
        try {
          const parsedSession = JSON.parse(stored);
          if (isValidSession(parsedSession)) {
            setSession(parsedSession);
          } else {
            localStorage.removeItem("library-sky-session");
            setSession(null);
          }
        } catch {
          localStorage.removeItem("library-sky-session");
          setSession(null);
        }
      } else {
        setSession(null);
      }
    };

    window.addEventListener("library-sky-session-change", handleSessionChangeEvent);
    return () => {
      window.removeEventListener("library-sky-session-change", handleSessionChangeEvent);
    };
  }, []);

  if (isLoading) {
    return null;
  }

  const handleSessionChange = (newSession: BlueskySession | null) => {
    if (newSession && isValidSession(newSession)) {
      setSession(newSession);
      localStorage.setItem("library-sky-session", JSON.stringify(newSession));
      return;
    }

    localStorage.removeItem("library-sky-session");
    setSession(null);
  };

  return (
    <>
      <section className="space-y-4">
        <h1 className=" text-xl">
          読書ログをBlueskyでつけよう
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-300">
          Blueskyにログインして、読書ログを手軽に記録。<br />
          <a href="https://bsky.app/profile/did:plc:2atly2y5kfyjcj5zap6pv4wd/feed/aaaf7ciexzdpw" className="text-blue-600 dark:text-blue-400" target="_blank" rel="noopener noreferrer">BlueskyのFeed</a>で他の人の投稿を眺めて、新しい本との出会いを。<br />
          マイページで自分のログを一覧でき、読書の軌跡がひと目で分かります。<br />
        </p>

      </section>
      <HomeClient session={session} onSessionChange={handleSessionChange} />
    </>
  );
}
