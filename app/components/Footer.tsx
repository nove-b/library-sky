"use client";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-stone-200 bg-white/50 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/50">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6 sm:px-10">
        {/* Copyright */}
        <div className="text-xs">
          {/* <!-- Rakuten Web Services Attribution Snippet FROM HERE --> */}
          <a href="https://developers.rakuten.com/" target="_blank">Supported by Rakuten Developers</a>
          {/* <!-- Rakuten Web Services Attribution Snippet TO HERE --> */}
          <p className="text-stone-600 dark:text-stone-400">
            © {currentYear} Library Sky. All rights reserved.
          </p>
        </div>

        {/* Social Links */}
        <div className="flex items-center gap-4">
          {/* GitHub */}
          <a
            href="https://github.com/nove-b/library-sky"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
            aria-label="GitHubリポジトリへのリンク"
          >
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>

          {/* Bluesky */}
          <a
            href="https://bsky.app/profile/nove-b.dev"
            target="_blank"
            rel="noopener noreferrer"
            title="Bluesky"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 bg-white transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900  dark:hover:bg-stone-800"
            aria-label="Blueskyプロフィールへのリンク"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 fill-stone-900 dark:fill-white"
              shapeRendering="geometricPrecision"
              textRendering="geometricPrecision"
              imageRendering="optimizeQuality"
              fillRule="evenodd"
              clipRule="evenodd"
              viewBox="0 0 512 512"
            >
              <path d="M256 0c141.385 0 256 114.615 256 256S397.385 512 256 512 0 397.385 0 256 114.615 0 256 0zm-72.224 158.537c29.233 22.022 60.681 66.666 72.223 90.624 11.543-23.958 42.993-68.602 72.225-90.624 21.097-15.886 55.276-28.181 55.276 10.937 0 7.809-4.464 65.631-7.084 75.02-9.1 32.629-42.271 40.953-71.774 35.917 51.572 8.805 64.69 37.97 36.357 67.136-53.809 55.394-77.341-13.898-83.366-31.653-1.737-5.111-1.489-5.228-3.267 0-6.026 17.755-29.555 87.047-83.364 31.653-28.334-29.166-15.216-58.331 36.356-67.136-29.503 5.036-62.674-3.288-71.774-35.917-2.62-9.389-7.084-67.211-7.084-75.02 0-39.118 34.183-26.823 55.276-10.937z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
