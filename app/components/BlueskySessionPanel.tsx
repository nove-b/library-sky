"use client";

import { useEffect, useState } from "react";
import type { BlueskySession } from "@/lib/types";

interface BlueskySessionPanelProps {
  session: BlueskySession | null;
  onSessionChange: (session: BlueskySession | null) => void;
}

const STORAGE_KEY = "library-sky-session";

export default function BlueskySessionPanel({
  session,
  onSessionChange,
}: BlueskySessionPanelProps) {
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [service, setService] = useState("https://bsky.social");
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      if (session) return;

      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      try {
        const storedSession = JSON.parse(stored) as BlueskySession;

        // Try to refresh the session
        const response = await fetch("/api/bluesky/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refreshJwt: storedSession.refreshJwt,
            service: storedSession.service,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const refreshedSession: BlueskySession = {
            ...storedSession,
            handle: data.handle ?? storedSession.handle,
            displayName: data.displayName ?? storedSession.displayName,
            avatarUrl: data.avatarUrl ?? storedSession.avatarUrl,
            did: data.did ?? storedSession.did,
            accessJwt: data.accessJwt,
            refreshJwt: data.refreshJwt,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshedSession));
          onSessionChange(refreshedSession);
        } else {
          // Refresh failed, clear session
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.error("Failed to restore session:", error);
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    loadSession();
  }, [onSessionChange, session]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);

    if (!handle || !appPassword) {
      setNotice("ハンドルとアプリパスワードを入力してください。");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/bluesky/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, appPassword, service }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      const newSession: BlueskySession = {
        handle: data.handle,
        displayName: data.displayName ?? data.handle,
        avatarUrl: data.avatarUrl ?? "",
        did: data.did,
        accessJwt: data.accessJwt,
        refreshJwt: data.refreshJwt,
        service: data.service,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      window.dispatchEvent(new Event("library-sky-session-change"));
      onSessionChange(newSession);
      setAppPassword("");
      setNotice("Blueskyに接続しました。");
    } catch {
      setNotice("ログインできませんでした。ハンドルとアプリパスワードをご確認ください。");
    } finally {
      setIsLoading(false);
    }
  };



  if (session) {
    return null
  }

  return (
    <form
      onSubmit={handleLogin}
      className="space-y-4 rounded-xl border border-stone-200 bg-white p-5"
    >


      <p className="text-sm font-semibold text-stone-900">Blueskyに接続</p>
      <p className="text-xs text-stone-600">
        投稿にはアプリパスワードでログインします。
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          placeholder="handle.bsky.social"
          className="rounded-lg border border-stone-300 bg-stone-50 px-4 py-2 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-blue-500"
        />
        <input
          type="password"
          value={appPassword}
          onChange={(event) => setAppPassword(event.target.value)}
          placeholder="アプリパスワード"
          className="rounded-lg border border-stone-300 bg-stone-50 px-4 py-2 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-blue-500"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={service}
          onChange={(event) => setService(event.target.value)}
          placeholder="https://bsky.social"
          className="rounded-lg border border-stone-300 bg-stone-50 px-4 py-2 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "接続中..." : "接続"}
        </button>
      </div>
      {notice ? <p className="text-xs text-blue-600">{notice}</p> : null}
    </form>
  );
}
