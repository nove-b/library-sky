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

        {/* External Links */}
        <div className="flex items-center gap-4 border-t border-stone-200 pt-4 dark:border-stone-700">
          {/* Amazon Link */}
          <a
            href={`https://www.amazon.co.jp/s?k=${encodeURIComponent(`${log.title} ${log.author}`)}&tag=nove0822-22`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-amber-700 transition hover:text-amber-900 dark:text-amber-500 dark:hover:text-amber-300"
            title="Amazonで検索"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726-1.53.406-3.045.61-4.516.61-2.265 0-4.446-.433-6.538-1.304-2.032-.844-3.827-2.002-5.386-3.485-.11-.107-.127-.194-.052-.26zm15.273-11.28c.96-.85 2.11-1.277 3.455-1.277 1.615 0 2.83.565 3.65 1.687.815 1.113 1.222 2.755 1.222 4.912v6.85c0 .396-.045.658-.134.786-.09.126-.24.19-.455.19h-2.64c-.195 0-.348-.06-.447-.184-.1-.122-.148-.39-.148-.793v-.55c-.195.243-.51.524-.943.845-.435.326-1.025.613-1.77.87-.745.25-1.584.378-2.515.378-1.435 0-2.565-.383-3.395-1.15-.824-.765-1.237-1.765-1.237-2.998 0-1.355.455-2.37 1.365-3.043.91-.673 2.245-1.098 4.006-1.274l2.375-.236v-.55c0-.718-.17-1.238-.51-1.557-.34-.324-.87-.485-1.592-.485-.615 0-1.177.13-1.685.39-.51.26-.96.563-1.354.906-.22.195-.425.276-.615.243-.19-.03-.33-.162-.42-.39l-.764-1.56c-.07-.174-.06-.33.03-.478zm4.195 6.058l-1.318.158c-1.08.117-1.858.343-2.336.684-.477.34-.716.81-.716 1.413 0 .493.157.89.472 1.194.315.304.744.455 1.288.455.49 0 .93-.1 1.32-.303.39-.202.69-.458.896-.768.207-.31.31-.62.31-.93v-1.903z" />
            </svg>
            <span>Amazonで検索</span>
          </a>

          {/* Calil Link */}
          <a
            href={`https://calil.jp/search?q=${encodeURIComponent(`${log.title} ${log.author}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-emerald-700 transition hover:text-emerald-900 dark:text-emerald-500 dark:hover:text-emerald-300"
            title="カーリルで検索"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>カーリルで検索</span>
          </a>
        </div>

      </article>
    </>
  );
}
