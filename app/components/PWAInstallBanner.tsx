"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pwa-install-banner-dismissed";
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000; // 1週間

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 既にインストール済みかチェック
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // 最後に閉じた日時をチェック
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const now = Date.now();
      if (now - dismissedTime < WEEK_IN_MS) {
        return; // まだ1週間経っていない
      }
    }

    // beforeinstallpromptイベントをキャッチ
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // インストール完了後はバナーを非表示
    const handleAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
      <div className="rounded-xl border border-blue-200 bg-linear-to-br from-blue-50 to-white shadow-lg dark:border-blue-900/50 dark:from-blue-950/90 dark:to-stone-900/90 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 text-2xl">📚</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">
                Library Skyをインストール
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 mb-3">
                ホーム画面から素早くアクセスできます。オフラインでも一部機能が利用可能になります。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-700"
                >
                  インストール
                </button>
                <button
                  onClick={handleClose}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                >
                  後で
                </button>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="shrink-0 text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 transition"
              aria-label="閉じる"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
