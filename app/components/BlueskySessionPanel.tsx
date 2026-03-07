"use client";

import { useEffect, useState } from "react";
import BlueskyLink from "./BlueskyLink";
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
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

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
          if (response.status === 401 || response.status === 403) {
            window.dispatchEvent(new Event("library-sky-session-expired"));
          }
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
      className="space-y-4 rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
    >


      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100"><BlueskyLink asLink={false} />に接続</p>
      <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
        <p>投稿にはアプリパスワードでログインします。</p>
        <button
          type="button"
          onClick={() => setIsHelpModalOpen(true)}
          className="whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
        >
          取得方法
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          placeholder="handle.bsky.social"
          className="rounded-lg border border-stone-300 bg-stone-50 px-4 py-2 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-blue-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
        />
        <input
          type="password"
          value={appPassword}
          onChange={(event) => setAppPassword(event.target.value)}
          placeholder="アプリパスワード"
          className="rounded-lg border border-stone-300 bg-stone-50 px-4 py-2 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-blue-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={service}
          onChange={(event) => setService(event.target.value)}
          placeholder="https://bsky.social"
          className="rounded-lg border border-stone-300 bg-stone-50 px-4 py-2 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-blue-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "接続中..." : "接続"}
        </button>
      </div>
      {notice ? <p className="text-xs text-blue-600 dark:text-blue-400">{notice}</p> : null}

      {isHelpModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 px-4"
          onClick={() => setIsHelpModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-lg dark:border-stone-700 dark:bg-stone-900"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              アプリパスワードの取得方法
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-stone-700 dark:text-stone-300">
              <li><BlueskyLink asLink={false} />を開き、設定画面に移動します。</li>
              <li>「プライバシーとセキュリティ」を選択します。</li>
              <li>「アプリパスワード」を開いて新規作成します。</li>
              <li>表示されたパスワードをこの画面に入力します。</li>
            </ol>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
