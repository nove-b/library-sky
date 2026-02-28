"use client";

import Link from "next/link";
import type { BlueskySession } from "@/lib/types";

interface SiteHeaderProps {
  session: BlueskySession | null;
  onLogout: () => void;
}

export default function SiteHeader({ session, onLogout }: SiteHeaderProps) {
  console.log(session)
  return (
    <header className="fixed top-0 z-50 w-full border-b border-stone-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" >
          <div>
            <p className="text-lg">Library Sky</p>
            <p className="text-xs text-stone-500">blueskyで読書ログを取ろう</p>
          </div>
        </Link>
        {session && (
          <div className="flex items-center gap-3">
            <Link
              title={session.displayName}
              href={`/user/${session.handle}`}
              className="flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-stone-50 w-12 h-12 transition hover:bg-stone-100"
            >
              <img
                src={session.avatarUrl || "https://placehold.co/32x32/f5f5f4/000000?text=BS"}
                alt={session.displayName}
                className="h-full w-full rounded-full object-cover"
              />
            </Link>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event("library-sky-session-change"));
                onLogout();
              }}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
