"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      firstMenuItemRef.current?.focus();
    }
  }, [menuOpen]);

  const handleMenuItemClick = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const handleThemeClick = useCallback(() => {
    setMenuOpen(false);
    onToggleTheme();
  }, [onToggleTheme]);

  const handleLogoutClick = useCallback(() => {
    setMenuOpen(false);
    onLogout();
  }, [onLogout]);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-stone-200 bg-white/80 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/80">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4 sm:px-10">
        <Link href="/" className="min-w-0">
          <div>
            <h1 className="flex items-center gap-2"><img className="w-5 h-5" src="/icon.svg" alt="" /><span>Library Sky</span></h1>
            <p className="text-xs text-stone-500 dark:text-stone-400"><BlueskyLink asLink={false} />で読書ログを取ろう</p>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-3">
          {session && (
            <Link
              title={session.displayName}
              href={`/user/${session.handle}`}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-stone-50 transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700"
            >
              <img
                src={session.avatarUrl || "https://placehold.co/32x32/f5f5f4/000000?text=BS"}
                alt={session.displayName}
                className="h-full w-full rounded-full object-cover"
              />
            </Link>
          )}

          {/* Hamburger menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
              aria-label="メニューを開く"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              {menuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>

            {menuOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-48 rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
                <Link
                  ref={firstMenuItemRef}
                  href="/users"
                  role="menuitem"
                  onClick={handleMenuItemClick}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  ユーザー一覧
                </Link>
                <Link
                  href="/about"
                  role="menuitem"
                  onClick={handleMenuItemClick}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  使い方
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleThemeClick}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
                  {theme === "dark" ? "ライトモード" : "ダークモード"}
                </button>
                {session && (
                  <>
                    <div className="my-1 border-t border-stone-100 dark:border-stone-800" role="separator" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogoutClick}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      ログアウト
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
