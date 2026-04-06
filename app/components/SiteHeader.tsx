"use client";

import Link from "next/link";
import BlueskyLink from "./BlueskyLink";
import type { BlueskySession } from "@/lib/types";

interface SiteHeaderProps {
  session: BlueskySession | null;
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export default function SiteHeader({ session, onLogout, theme, onToggleTheme }: SiteHeaderProps) {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-stone-200 bg-white/80 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/80">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" >
          <div>
            <h1 className="flex items-center gap-2"><img className="w-5 h-5" src="/icon.svg" alt="" /><span>Library Sky</span></h1>
            <p className="text-xs text-stone-500 dark:text-stone-400"><BlueskyLink asLink={false} />で読書ログを取ろう</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {session && (
            <Link
              title={session.displayName}
              href={`/user/${session.handle}`}
              className="flex h-12 w-12 items-center justify-center gap-2 rounded-full border border-stone-200 bg-stone-50 transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700"
            >
              <img
                src={session.avatarUrl || "https://placehold.co/32x32/f5f5f4/000000?text=BS"}
                alt={session.displayName}
                className="h-full w-full rounded-full object-cover"
              />
            </Link>
          )}
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
            aria-label="テーマを切り替える"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          {session && (
            <button
              type="button"
              onClick={onLogout}
              data-testid="logout-button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
              aria-label="ログアウト"
              title="ログアウト"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}


        </div>
      </div>
    </header>
  );
}
