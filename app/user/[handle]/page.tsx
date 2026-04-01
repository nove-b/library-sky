"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const handle = params.handle as string;


  const [books, setBooks] = useState<BookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(handle);
  const [userDid, setUserDid] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentUserDid, setCurrentUserDid] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(searchParams.get("status"));
  const [selectedMonth, setSelectedMonth] = useState<string | null>(searchParams.get("month"));

  // URLクエリパラメーターを更新
  const updateQueryParams = (status: string | null, month: string | null) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (month) params.set("month", month);
    const queryString = params.toString();
    router.replace(`/user/${handle}${queryString ? `?${queryString}` : ""}`, { scroll: false });
  };

  // 年月のリストを生成
  const getAvailableMonths = () => {
    const monthSet = new Set<string>();
    books.forEach((book) => {
      const date = new Date(book.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthSet.add(monthKey);
    });
    return Array.from(monthSet).sort().reverse();
  };

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
          did: session.did,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));

        // OAuth時の401でもセッション失効と見なさない
        const shouldExpire =
          response.status === 401 &&
          typeof err?.error === "string" &&
          /expired|invalid auth|session/i.test(err.error);

        if (shouldExpire) {
          window.dispatchEvent(new Event("library-sky-session-expired"));
          return;
        }

        throw new Error(err?.error || "削除に失敗しました");
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

  const resolveRakutenUrl = async (book: BookLog): Promise<string> => {
    if (book.affiliateUrl) {
      return book.affiliateUrl;
    }

    if (book.uri?.startsWith("at://")) {
      try {
        const response = await fetch(
          `/api/bluesky/record?uri=${encodeURIComponent(book.uri)}`
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

    return `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(`${book.title} ${book.author}`)}`;
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
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
            className="text-blue-600 transition hover:opacity-80 dark:text-blue-400"
          >
            <h1 className="text-xl  mb-2 ">📚 {displayName}</h1>
          </Link>
        ) : (
          <h1 className="text-xl  mb-2 ">📚 {displayName} </h1>
        )}
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
        {/* Status Filter */}
        <select
          value={selectedStatus || ""}
          onChange={(e) => {
            const newStatus = e.target.value || null;
            setSelectedStatus(newStatus);
            updateQueryParams(newStatus, selectedMonth);
          }}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:focus:ring-offset-stone-950"
          aria-label="ステータスでフィルター"
        >
          <option value="">すべてのステータス</option>
          <option value="want">読みたい</option>
          <option value="reading">読書中</option>
          <option value="completed">読了</option>
          <option value="dropped">中断</option>
        </select>

        {/* Month Filter */}
        <select
          value={selectedMonth || ""}
          onChange={(e) => {
            const newMonth = e.target.value || null;
            setSelectedMonth(newMonth);
            updateQueryParams(selectedStatus, newMonth);
          }}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:focus:ring-offset-stone-950"
          aria-label="年月でフィルター"
        >
          <option value="">すべての期間</option>
          {getAvailableMonths().map((month) => (
            <option key={month} value={month}>
              {new Date(month).toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
            </option>
          ))}
        </select>
      </div>

      {(() => {
        let filteredBooks = books;

        // ステータスでフィルター
        if (selectedStatus) {
          filteredBooks = filteredBooks.filter((book) => book.status === selectedStatus);
        }

        // 年月でフィルター
        if (selectedMonth) {
          filteredBooks = filteredBooks.filter((book) => {
            const bookDate = new Date(book.createdAt);
            const bookMonth = `${bookDate.getFullYear()}-${String(bookDate.getMonth() + 1).padStart(2, "0")}`;
            return bookMonth === selectedMonth;
          });
        }

        // フィルター条件のテキストを生成
        const getFilterText = () => {
          const parts = [];
          if (selectedStatus) {
            parts.push(STATUS_LABELS[selectedStatus]);
          }
          if (selectedMonth) {
            const monthText = new Date(selectedMonth).toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
            parts.push(monthText);
          }
          return parts.length > 0 ? parts.join("・") + "で" : "";
        };

        return (
          <>
            <p className="mb-6 text-sm text-stone-600 dark:text-stone-400">
              📚 {getFilterText()} ｜ ✍️ {filteredBooks.length}件の感想を積み上げ中
            </p>

            {filteredBooks.length === 0 ? (
              <div className="text-center py-12">
                <p className="mb-2 text-stone-500 dark:text-stone-400">
                  {selectedStatus || selectedMonth ? "この条件に該当する本はありません" : "📭 まだ本を記録していません"}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredBooks.map((book) => {
                  const tid = book.uri.split("/").pop() || "";
                  return (
                    <Link
                      key={book.cid}
                      href={`/log/${handle}/${tid}?uri=${encodeURIComponent(book.uri)}`}
                    >
                      <article
                        className="cursor-pointer rounded-lg border border-stone-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-blue-700"
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
                              <div className="flex h-24 w-16 items-center justify-center rounded-lg bg-stone-200 dark:bg-stone-700">
                                <span className="text-xs text-stone-400 dark:text-stone-300">No Image</span>
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex flex-col grow gap-2">
                            {/* Title & Author */}
                            <div>
                              <div className="flex justify-between items-center">

                                <h2 className="line-clamp-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
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
                                    className="p-1 text-stone-400 transition hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
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
                                    <div className="absolute right-0 z-10 rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleShareLog(book);
                                        }}
                                        className="flex w-full items-center gap-2 border-b border-stone-200 px-4 py-2 text-left text-sm text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
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
                                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
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
                              <p className="text-xs text-stone-600 dark:text-stone-400">
                                {book.author}
                              </p>
                            </div>
                            {/* Footer */}
                            <div className="mt-auto pt-2 flex flex-wrap items-center gap-2 text-xs">
                              {/* Rating */}
                              <div className="flex items-center gap-1">
                                <span className="text-amber-600">{"⭐".repeat(book.rating)}</span>
                                <span className="text-stone-500 dark:text-stone-400">{book.rating}/5</span>
                              </div>

                              {/* Status Badge */}
                              <span className="rounded-full border border-stone-300 bg-stone-100 px-2 py-1 font-medium text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
                                {STATUS_LABELS[book.status] || book.status}
                              </span>
                            </div>

                            {/* Comment */}
                            {book.comment && (
                              <p className="line-clamp-2 text-sm text-stone-700 dark:text-stone-300">
                                {book.comment}
                              </p>
                            )}

                            {/* Engagement metrics */}
                            {(book.likeCount !== undefined || book.replyCount !== undefined) && (
                              <div className="flex items-center gap-3 text-xs">
                                {book.likeCount !== undefined && (
                                  <span className="flex items-center gap-1 text-stone-600 dark:text-stone-400">
                                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                    </svg>
                                    {book.likeCount}
                                  </span>
                                )}
                                {book.replyCount !== undefined && (
                                  <span className="flex items-center gap-1 text-stone-600 dark:text-stone-400">
                                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                    </svg>
                                    {book.replyCount}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Bluesky Post Link */}
                            {book.postUri && (
                              <div className="flex items-center pt-1">
                                <span
                                  role="link"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.open(
                                      book.postUri.replace('at://', 'https://bsky.app/profile/').replace('/app.bsky.feed.post/', '/post/'),
                                      '_blank',
                                      'noopener,noreferrer'
                                    );
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      window.open(
                                        book.postUri.replace('at://', 'https://bsky.app/profile/').replace('/app.bsky.feed.post/', '/post/'),
                                        '_blank',
                                        'noopener,noreferrer'
                                      );
                                    }
                                  }}
                                  className="flex items-center gap-1 text-xs text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="Blueskyで見る"
                                >
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 600 530" fill="currentColor">
                                    <path d="M135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" />
                                  </svg>
                                  <span>Blueskyで見る</span>
                                </span>
                              </div>
                            )}

                            {/* External Links */}
                            <div className="flex items-center gap-3 pt-2">
                              {/* Amazon Link */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.open(`https://www.amazon.co.jp/s?k=${encodeURIComponent(`${book.title} ${book.author}`)}&tag=nove0822-22`, '_blank', 'noopener,noreferrer');
                                }}
                                className="flex items-center gap-1 text-xs text-amber-700 transition hover:text-amber-900 dark:text-amber-500 dark:hover:text-amber-300"
                                title="Amazon"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z" />
                                  <path d="M5 5h6v2H7v10h10v-4h2v6H5V5z" />
                                </svg>
                                <span>Amazon</span>
                              </button>

                              {/* Rakuten Link */}
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const rakutenUrl = await resolveRakutenUrl(book);
                                  window.open(rakutenUrl, '_blank', 'noopener,noreferrer');
                                }}
                                className="flex items-center gap-1 text-xs text-rose-700 transition hover:text-rose-900 dark:text-rose-500 dark:hover:text-rose-300"
                                title="楽天"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z" />
                                  <path d="M5 5h6v2H7v10h10v-4h2v6H5V5z" />
                                </svg>
                                <span>楽天</span>
                              </button>

                              {/* Calil Link */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.open(`https://calil.jp/search?q=${encodeURIComponent(`${book.title} ${book.author}`)}`, '_blank', 'noopener,noreferrer');
                                }}
                                className="flex items-center gap-1 text-xs text-[#2ab6e9] transition hover:text-[#1a8bb8] dark:text-[#1a8bb8] dark:hover:text-[#0d5a7a]"
                                title="カーリル"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z" />
                                  <path d="M5 5h6v2H7v10h10v-4h2v6H5V5z" />
                                </svg>
                                <span>カーリル</span>
                              </button>
                            </div>

                          </div>


                        </div>
                        {/* Date */}
                        <span className="mt-2 block text-right text-xs text-stone-500 dark:text-stone-400">
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
      })()}
    </>
  );
}
