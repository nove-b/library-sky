"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { BookLog } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  want: "読みたい",
  reading: "読書中",
  completed: "読了",
  dropped: "中断",
};

export default function BookLogDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const handle = params.handle as string;
  const tid = params.tid as string;
  const uriFromQuery = searchParams?.get("uri");

  const [log, setLog] = useState<BookLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveRakutenUrl = async (targetLog: BookLog): Promise<string> => {
    if (targetLog.affiliateUrl) {
      return targetLog.affiliateUrl;
    }

    if (targetLog.uri?.startsWith("at://")) {
      try {
        const response = await fetch(
          `/api/bluesky/record?uri=${encodeURIComponent(targetLog.uri)}`
        );

        if (response.ok) {
          const data: { record?: Record<string, unknown> } = await response.json();
          const affiliateUrl = data.record?.affiliateUrl;
          if (typeof affiliateUrl === "string" && affiliateUrl) {
            return affiliateUrl;
          }
        }
      } catch {
        // Fall back to search URL when record fetch fails
      }
    }

    return `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(`${targetLog.title} ${targetLog.author}`)}`;
  };

  useEffect(() => {
    const fetchLog = async () => {
      try {
        setLoading(true);
        setError(null);

        // ユーザーのレコードを取得
        const response = await fetch(
          `/api/bluesky/records?handle=${encodeURIComponent(handle)}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch records");
        }

        const data: { books: BookLog[] } = await response.json();

        // TID で該当するレコードを見つける
        let foundLog: BookLog | undefined;

        // クエリパラメータのURIがある場合は、それで一致するものを探す
        if (uriFromQuery) {
          foundLog = data.books.find((b) => b.uri === uriFromQuery);
        }

        // URIで見つからない場合、tidで探す
        if (!foundLog) {
          foundLog = data.books.find((b) => {
            const recordTid = b.uri.split("/").pop();
            return recordTid === tid;
          });
        }

        if (!foundLog) {
          throw new Error("Log not found");
        }

        // URIがあれば、レコードから完全なデータを取得して上書き
        if (foundLog.uri && foundLog.uri.startsWith("at://")) {
          try {
            const recordResponse = await fetch(
              `/api/bluesky/record?uri=${encodeURIComponent(foundLog.uri)}`
            );
            if (recordResponse.ok) {
              const recordData: { record: Record<string, unknown> } =
                await recordResponse.json();
              const record = recordData.record as Record<string, unknown>;

              // レコードから完全なコメントを取得して上書き
              if (typeof record.comment === "string") {
                foundLog.comment = record.comment;
              }
              if (typeof record.affiliateUrl === "string") {
                foundLog.affiliateUrl = record.affiliateUrl;
              }
            }
          } catch (err) {
            console.warn("Failed to fetch full record:", err);
            // Fallback to what we have
          }
        }

        setLog(foundLog);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (handle && tid) {
      fetchLog();
    }
  }, [handle, tid, uriFromQuery]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500 dark:text-stone-400">読み込み中...</div>
      </div>
    );
  }

  if (error || !log) {
    return (
      <>
        <Link
          href="/"
          className="mb-6 inline-block font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← 戻る
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-red-700 dark:text-red-300">
            {error || "ログが見つかりません"}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Link
        href={`/user/${handle}`}
        className="mb-6 inline-block font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        ← {handle}に戻る
      </Link>

      <article className="space-y-6 rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        {/* ヘッダー */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{log.title}</h1>
              <p className="text-sm text-stone-600 dark:text-stone-400">✍️ {log.author}</p>
            </div>
            {log.imageUrl && (
              <div className="shrink-0">
                <img
                  src={log.imageUrl}
                  alt={log.title}
                  className="w-20 h-28 object-cover rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full border border-stone-300 bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 ${log.status === "want"
                ? ""
                : log.status === "reading"
                  ? ""
                  : log.status === "completed"
                    ? ""
                    : ""
                }`}
            >
              {STATUS_LABELS[log.status] || log.status}
            </span>
            {log.rating > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-amber-600">{"⭐".repeat(log.rating)}</span>
                <span className="text-stone-500 dark:text-stone-400">{log.rating}/5</span>
              </div>
            )}
          </div>

          <div className="text-xs text-stone-500 dark:text-stone-400">
            📅 {new Date(log.createdAt).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>

        {/* コメント */}
        {log.comment && (
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800">
            <h2 className="mb-2 text-sm font-semibold text-stone-900 dark:text-stone-100">💬 感想</h2>
            <p className="whitespace-pre-wrap text-sm text-stone-700 dark:text-stone-300">{log.comment}</p>
          </div>
        )}

        {/* Engagement metrics */}
        {(log.likeCount !== undefined || log.replyCount !== undefined) && (
          <div className="flex items-center gap-3 text-xs">
            {log.likeCount !== undefined && (
              <span className="flex items-center gap-1 text-stone-600 dark:text-stone-400">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                {log.likeCount}
              </span>
            )}
            {log.replyCount !== undefined && (
              <span className="flex items-center gap-1 text-stone-600 dark:text-stone-400">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
                {log.replyCount}
              </span>
            )}
          </div>
        )}

        {/* Bluesky Post Link */}
        {log.postUri && (
          <div className="flex items-center">
            <a
              href={log.postUri.replace('at://', 'https://bsky.app/profile/').replace('/app.bsky.feed.post/', '/post/')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              title="Blueskyで見る"
            >
              <svg className="h-4 w-4" viewBox="0 0 600 530" fill="currentColor">
                <path d="M135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" />
              </svg>
              <span>Blueskyで見る</span>
            </a>
          </div>
        )}

        {/* External Links */}
        <div className="flex flex-wrap items-center gap-4 border-t border-stone-200 pt-4 dark:border-stone-700">
          {/* Amazon Link */}
          <a
            href={`https://www.amazon.co.jp/s?k=${encodeURIComponent(`${log.title} ${log.author}`)}&tag=nove0822-22`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-amber-700 transition hover:text-amber-900 dark:text-amber-500 dark:hover:text-amber-300"
            title="Amazonで検索"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z" />
              <path d="M5 5h6v2H7v10h10v-4h2v6H5V5z" />
            </svg>
            <span>Amazonで検索</span>
          </a>

          {/* Rakuten Link */}
          <button
            type="button"
            onClick={async () => {
              const rakutenUrl = await resolveRakutenUrl(log);
              window.open(rakutenUrl, "_blank", "noopener,noreferrer");
            }}
            className="flex items-center gap-2 text-sm text-rose-700 transition hover:text-rose-900 dark:text-rose-500 dark:hover:text-rose-300"
            title="楽天で見る"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z" />
              <path d="M5 5h6v2H7v10h10v-4h2v6H5V5z" />
            </svg>
            <span>楽天で見る</span>
          </button>

          {/* Calil Link */}
          <a
            href={`https://calil.jp/search?q=${encodeURIComponent(`${log.title} ${log.author}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#2ab6e9] transition hover:text-[#1a8bb8] dark:text-[#1a8bb8] dark:hover:text-[#0d5a7a]"
            title="カーリルで検索"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z" />
              <path d="M5 5h6v2H7v10h10v-4h2v6H5V5z" />
            </svg>
            <span>カーリルで検索</span>
          </a>
        </div>

      </article>
    </>
  );
}
