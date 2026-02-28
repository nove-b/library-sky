"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import type { BlueskySession, Book, ReadingStatus } from "@/lib/types";

const statusOptions: { value: ReadingStatus; label: string }[] = [
  { value: "want", label: "読みたい" },
  { value: "reading", label: "読書中" },
  { value: "completed", label: "読了" },
  { value: "dropped", label: "中断" },
];

interface LogComposerProps {
  session: BlueskySession | null;
}

export default function LogComposer({ session }: LogComposerProps) {
  const [status, setStatus] = useState<ReadingStatus>("reading");
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!title.trim()) {
      setSearchError("書籍名を入力してください。");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(false);

    try {
      const response = await fetch(
        `/api/books/serch?query=${encodeURIComponent(title.trim())}`
      );
      if (!response.ok) {
        throw new Error("Failed to search");
      }
      const data = await response.json();
      setSearchResults(data.items ?? []);
      setHasSearched(true);
    } catch {
      setSearchError("書籍を検索できませんでした。再度お試しください。");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session) {
      setNotice("投稿するにはBlueskyにログインしてください。");
      return;
    }

    if (!title.trim() || !author.trim()) {
      setNotice("書籍名と著者名を入力してください。");
      return;
    }

    setIsPosting(true);
    setNotice(null);

    try {
      const book: Book = {
        title: title.trim(),
        author: author.trim(),
        imageUrl: imageUrl.trim(),
        asin: `manual-${Date.now()}`,
      };

      const response = await fetch("/api/bluesky/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessJwt: session.accessJwt,
          refreshJwt: session.refreshJwt,
          did: session.did,
          handle: session.handle,
          book,
          status,
          rating,
          comment,
          service: session.service,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const missingFields =
          errorBody && Array.isArray(errorBody.missingFields)
            ? errorBody.missingFields.filter(
              (field: unknown): field is string => typeof field === "string"
            )
            : [];
        const errorMessage =
          (errorBody && typeof errorBody.error === "string" && errorBody.error) ||
          "Failed to post log";
        const detail = missingFields.length
          ? ` (${missingFields.join(", ")} が不足しています。再ログインしてください)`
          : "";
        throw new Error(`${errorMessage}${detail}`);
      }

      setComment("");
      setNotice("Blueskyに投稿しました。");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `投稿できませんでした: ${error.message}`
          : "投稿できませんでした。しばらくしてから再度お試しください。"
      );
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <section id="compose" className="space-y-5">
      {!session ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          読書ログを投稿するにはBlueskyにログインしてください。
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900"
      >
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">読書ログを投稿</p>
        <p className="text-xs text-stone-600 dark:text-stone-400">
          読んだ本の情報と感想をBlueskyに投稿できます。
        </p>

        <div className="mb-3">

          <label className="space-y-2 text-xs font-medium text-stone-900 dark:text-stone-200">
            書籍名
            <div className="flex gap-1.5">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="タイトルを入力"
                className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-blue-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={isSearching}
                className="whitespace-nowrap rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                {isSearching ? "検索中..." : "検索"}
              </button>
            </div>
          </label>


        </div>

        {searchError ? (
          <p className="text-xs text-red-600 dark:text-red-400">{searchError}</p>
        ) : null}
        {hasSearched && searchResults.length === 0 && !searchError ? (
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-center dark:border-stone-700 dark:bg-stone-800">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              「{title}」の検索結果が見つかりませんでした。
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-500 mt-1">
              別のキーワードで検索してみてください。
            </p>
          </div>
        ) : null}
        {searchResults.length > 0 ? (
          <div className="grid gap-3">
            {searchResults.map((result) => (
              <button
                key={result.asin}
                type="button"
                onClick={() => {
                  setTitle(result.title);
                  setAuthor(result.author);
                  setImageUrl(result.imageUrl);
                  setSearchResults([result]);
                }}
                className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-blue-700 dark:hover:bg-stone-700"
              >
                {result.imageUrl ? (
                  <img
                    src={result.imageUrl}
                    alt={result.title}
                    className="h-14 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-14 w-10 rounded-lg bg-stone-200 dark:bg-stone-700 flex items-center justify-center">
                    <span className="text-xs text-stone-400">📚</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{result.title}</p>
                  <p className="text-xs text-stone-600 dark:text-stone-400">{result.author}</p>
                </div>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">選択</span>
              </button>
            ))}
          </div>
        ) : null}


        <div className="mb-3">
          <label className="mb-3 space-y-2 text-xs font-medium text-stone-900 dark:text-stone-200">
            ステータス
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ReadingStatus)}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-blue-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mb-3">
          <label className="space-y-2 text-xs font-medium text-stone-900 dark:text-stone-200">
            評価 ({rating}/5)
            <input
              type="range"
              min={0}
              max={5}
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
              className="w-full mt-2"
            />
          </label>
        </div>

        <div className="mb-3">
          <label className="space-y-2 text-xs font-medium text-stone-900 dark:text-stone-200">
            コメント
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="感想をひとこと"
              rows={3}
              className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-blue-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
            />
          </label>
        </div>

        {notice ? <p className="text-xs text-blue-600 dark:text-blue-400">{notice}</p> : null}

        <button
          type="submit"
          disabled={isPosting || !session}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPosting ? "投稿中..." : "Blueskyに投稿"}
        </button>
      </form>
    </section>
  );
}
