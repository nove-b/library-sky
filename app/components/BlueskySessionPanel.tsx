"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      if (session) return;

      // Check for OAuth errors
      const oauthError = searchParams.get("oauth_error");
      if (oauthError) {
        setNotice(`ログインエラー: ${oauthError}`);
        return;
      }

      // Try to fetch session from API (set by OAuth callback)
      try {
        const response = await fetch("/api/bluesky/me");
        if (response.ok) {
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
          return;
        }
      } catch (error) {
        console.error("Failed to fetch session from API:", error);
      }

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
  }, [onSessionChange, session, searchParams]);

  const handleOAuthLogin = async () => {
    setIsLoading(true);
    try {
      // Get the authorize URL from the API
      const response = await fetch("/api/bluesky/oauth/authorize");

      if (response.redirected) {
        // Follow the redirect manually
        window.location.href = response.url;
      } else if (response.status >= 300 && response.status < 400) {
        // Handle 3xx status
        const location = response.headers.get("Location");
        if (location) {
          window.location.href = location;
        }
      } else {
        throw new Error("Failed to authorize");
      }
    } catch (error) {
      console.error("OAuth login error:", error);
      setNotice("ログインの開始に失敗しました。");
      setIsLoading(false);
    }
  };



  if (session) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
        Blueskyに接続
      </p>
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Bluesky OAuthを使用してセキュアにログインします。
      </p>
      <button
        onClick={handleOAuthLogin}
        disabled={isLoading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "接続中..." : "Blueskyでログイン"}
      </button>
      {notice ? (
        <p className="text-xs text-blue-600 dark:text-blue-400">{notice}</p>
      ) : null}
    </div>
  );
}
