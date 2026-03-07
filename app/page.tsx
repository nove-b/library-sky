"use client";

import { useSyncExternalStore } from "react";
import HomeClient from "./components/HomeClient";
import BlueskyLink from "./components/BlueskyLink";
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

function getSessionSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("library-sky-session");
}

function getServerSnapshot(): string | null {
  return null;
}

function subscribe(callback: () => void) {
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
    const parsedSession = JSON.parse(sessionString);
    if (isValidSession(parsedSession)) {
      return parsedSession;
    }
    localStorage.removeItem("library-sky-session");
  } catch {
    localStorage.removeItem("library-sky-session");
  }
  return null;
}

export default function Home() {
  const sessionString = useSyncExternalStore(subscribe, getSessionSnapshot, getServerSnapshot);
  const session = parseSession(sessionString);

  const handleSessionChange = (newSession: BlueskySession | null) => {
    if (newSession && isValidSession(newSession)) {
      localStorage.setItem("library-sky-session", JSON.stringify(newSession));
      window.dispatchEvent(new Event("library-sky-session-change"));
      return;
    }

    localStorage.removeItem("library-sky-session");
    window.dispatchEvent(new Event("library-sky-session-change"));
  };

  return (
    <>
      <section className="space-y-4">
        <h1 className=" text-xl">
          読書ログを<BlueskyLink asLink={false} />でつけよう
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-300">
          <BlueskyLink asLink={false} />にログインして、読書ログを手軽に記録。<br />
          <BlueskyLink href="https://bsky.app/profile/did:plc:2atly2y5kfyjcj5zap6pv4wd/feed/aaaf7ciexzdpw">Bluesky</BlueskyLink>のFeedで他の人の投稿を眺めて、新しい本との出会いを。<br />
          マイページで自分のログを一覧でき、読書の軌跡がひと目で分かります。<br />
        </p>

      </section>
      <HomeClient session={session} onSessionChange={handleSessionChange} />
    </>
  );
}
