"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { BookLog } from "@/lib/types";

interface FetchResponse {
  success: boolean;
  did: string;
  books: BookLog[];
  count: number;
}

const STATUS_LABELS: Record<string, string> = {
  want: "読みたい",
  reading: "読書中",
  completed: "読了",
  dropped: "中断",
};

function extractDidFromUri(uri: string): string | null {
  const match = uri.match(/at:\/\/([^/]+)/);
  return match ? match[1] : null;
}

export default function UserBooksPage() {
  const params = useParams();
  const handle = params.handle as string;


  const [books, setBooks] = useState<BookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(handle);
  const [userDid, setUserDid] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentUserDid, setCurrentUserDid] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        setError(null);

        // ユーザーのレコードを取得
        const response = await fetch(
          `/api/bluesky/records?handle=${encodeURIComponent(handle)}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.error || `API Error: ${response.status}`;
          throw new Error(errorMessage);
        }

        const data: FetchResponse = await response.json();
        setUserDid(data.did);
        setBooks(
          data.books.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );

        // プロフィール情報取得
        try {
          const profileRes = await fetch(
            `/api/bluesky/profile?handle=${encodeURIComponent(handle)}`
          );
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            setDisplayName(profileData.displayName || handle);
          }
        } catch {
          // プロフィール取得失敗時はハンドルを使用
        }

        // セッション情報取得
        const stored = localStorage.getItem("library-sky-session");
        if (stored) {
          try {
            const session = JSON.parse(stored);
            setCurrentUserDid(session.did);
          } catch {
            // セッション情報が無効
          }
        }
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    if (handle) {
      fetchBooks();
    }
  }, [handle]);

  const handleDeleteLog = async (book: BookLog) => {
    // localStorageからセッション情報を取得
    const stored = localStorage.getItem("library-sky-session");
    if (!stored) {
      alert("ログインしてください");
      return;
    }

    let session;
    try {
      session = JSON.parse(stored);
    } catch {
      alert("セッション情報が無効です。再度ログインしてください");
      return;
    }

    if (!confirm(`「${book.title}」を削除してもいいですか?`)) {
      return;
    }

    setDeletingId(book.cid);
    try {
      const response = await fetch("/api/bluesky/log", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uri: book.uri,
          cid: book.cid,
          postUri: book.postUri,
          accessJwt: session.accessJwt,
          refreshJwt: session.refreshJwt,
        }),
      });

      if (!response.ok) {
        throw new Error("削除に失敗しました");
      }

      // 削除成功後、一覧から該当する本を削除
      setBooks(books.filter((b) => b.cid !== book.cid));
      setOpenMenuId(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  const handleShareLog = async (book: BookLog) => {
    // URI から TID を抽出
    const tid = book.uri.split("/").pop() || "";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/log/${handle}/${tid}`;

    // Web Share API が利用可能な場合は使用
    if (navigator.share) {
      try {
        await navigator.share({
          title: `📚 ${book.title}`,
          text: `${book.title} - ${book.author}`,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Share failed:", error);
        }
      }
    } else {
      // フォールバック: URLをコピー
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("URLをコピーしました！");
      } catch {
        alert("共有URLをコピーできませんでした");
      }
    }
    setOpenMenuId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-stone-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        エラー: {error}
      </div>
    );
  }

  return (
    <>
      <header className="mb-8">
        {userDid ? (
          <Link
            href={`https://bsky.app/profile/${userDid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition text-blue-600"
          >
            <h1 className="text-xl  mb-2 ">📚 {displayName}</h1>
          </Link>
        ) : (
          <h1 className="text-xl  mb-2 ">📚 {displayName} </h1>
        )}
        <p className="text-stone-600">
          {books.length} 件の感想を記録しています...
        </p>
      </header>

      {books.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-500 mb-2">📭 まだ本を記録していません</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {books.map((book) => {
            const tid = book.uri.split("/").pop() || "";
            return (
              <Link
                key={book.cid}
                href={`/log/${handle}/${tid}?uri=${encodeURIComponent(book.uri)}`}
              >
                <article
                  className="border border-stone-200 rounded-lg p-4 cursor-pointer transition hover:border-blue-300 hover:shadow-md bg-white"
                >
                  <div className="flex gap-4">
                    {/* Book Cover */}
                    <div className="shrink-0">
                      {book.imageUrl ? (
                        <img
                          src={book.imageUrl}
                          alt={book.title}
                          className="w-16 h-24 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-24 bg-stone-200 flex items-center justify-center rounded-lg">
                          <span className="text-xs text-stone-400">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex flex-col grow gap-2">
                      {/* Title & Author */}
                      <div>
                        <div className="flex justify-between items-center">

                          <h2 className="text-sm font-semibold text-stone-900 line-clamp-2">
                            {book.title}
                          </h2>
                          <div className="relative">
                            {/* Menu Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === book.cid ? null : book.cid);
                              }}
                              className="p-1 text-stone-400 hover:text-stone-600 transition"
                              title="メニュー"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <circle cx="10" cy="3" r="1.5" />
                                <circle cx="10" cy="10" r="1.5" />
                                <circle cx="10" cy="17" r="1.5" />
                              </svg>
                            </button>

                            {/* ドロップダウンメニュー */}
                            {openMenuId === book.cid && (
                              <div className="absolute right-0  bg-white border border-stone-200 rounded-lg shadow-lg z-10">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleShareLog(book);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-2 border-b border-stone-200"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                    />
                                  </svg>
                                  Share
                                </button>
                                {currentUserDid && extractDidFromUri(book.uri) === currentUserDid && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteLog(book);
                                    }}
                                    disabled={deletingId === book.cid}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                    {deletingId === book.cid ? "削除中..." : "削除"}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-stone-600">
                          {book.author}
                        </p>
                      </div>
                      {/* Footer */}
                      <div className="mt-auto pt-2 flex flex-wrap items-center gap-2 text-xs">
                        {/* Rating */}
                        <div className="flex items-center gap-1">
                          <span className="text-amber-600">{"⭐".repeat(book.rating)}</span>
                          <span className="text-stone-500">{book.rating}/5</span>
                        </div>

                        {/* Status Badge */}
                        <span className="px-2 py-1 rounded-full border border-stone-300 bg-stone-100 text-stone-700 font-medium">
                          {STATUS_LABELS[book.status] || book.status}
                        </span>


                      </div>

                      {/* Comment */}
                      {book.comment && (
                        <p className="text-sm text-stone-700 line-clamp-2">
                          {book.comment}
                        </p>
                      )}


                    </div>


                  </div>
                  {/* Date */}
                  <span className="text-stone-500 text-xs mt-2 text-right block">
                    {new Date(book.createdAt).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
