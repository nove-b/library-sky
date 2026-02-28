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
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error || !log) {
    return (
      <>
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-700 mb-6 inline-block font-medium"
        >
          ← 戻る
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">
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
        className="text-blue-600 hover:text-blue-700 mb-6 inline-block font-medium"
      >
        ← {handle}に戻る
      </Link>

      <article className="border border-stone-200 rounded-lg bg-white p-6 space-y-6">
        {/* ヘッダー */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <h1 className="text-lg font-semibold text-stone-900">{log.title}</h1>
              <p className="text-sm text-stone-600">✍️ {log.author}</p>
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
              className={`px-2 py-1 rounded-full border border-stone-300 bg-stone-100 text-stone-700 text-xs font-medium ${log.status === "want"
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
                <span className="text-stone-500">{log.rating}/5</span>
              </div>
            )}
          </div>

          <div className="text-xs text-stone-500">
            📅 {new Date(log.createdAt).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>

        {/* コメント */}
        {log.comment && (
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-stone-900 mb-2">💬 感想</h2>
            <p className="text-sm text-stone-700 whitespace-pre-wrap">{log.comment}</p>
          </div>
        )}

        {/* Amazon リンク */}
        {log.amazonUrl && (
          <div className="flex gap-3">
            <Link
              href={log.amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-medium"
            >
              Amazonで見る →
            </Link>
          </div>
        )}
      </article>
    </>
  );
}
