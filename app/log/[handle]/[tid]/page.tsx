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

      </article>
    </>
  );
}
