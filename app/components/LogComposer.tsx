"use client";

import type { FormEvent } from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import BlueskyLink from "./BlueskyLink";
import type { BlueskySession, Book, ReadingStatus } from "@/lib/types";
import { saveDraft, loadDraft, clearDraft } from "@/lib/draft-storage";

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
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [postedLogUrl, setPostedLogUrl] = useState<string | null>(null);
  const [selectedAsin, setSelectedAsin] = useState<string | null>(null);

  // Load draft from localStorage on component mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setTitle(draft.title);
      setAuthor(draft.author);
      setComment(draft.comment);
      setStatus(draft.status);
      setRating(draft.rating);
      setImageUrl(draft.imageUrl);
      setAffiliateUrl(draft.affiliateUrl ?? "");
    }
  }, []);

  // Auto-save draft to localStorage on any form field change
  useEffect(() => {
    const draft = {
      title,
      author,
      comment,
      status,
      rating,
      imageUrl,
      affiliateUrl,
    };
    saveDraft(draft);
  }, [title, author, comment, status, rating, imageUrl, affiliateUrl]);

  const handleSearch = async () => {
    if (!title.trim()) {
      setSearchError("書籍名を入力してください。");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(false);
    setSelectedAsin(null);
    setAffiliateUrl("");

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
        affiliateUrl: affiliateUrl.trim() || undefined,
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
        if (response.status === 401 || response.status === 403) {
          // Save draft before session expires so user can recover it after re-login
          saveDraft({ title, author, comment, status, rating, imageUrl, affiliateUrl });
          window.dispatchEvent(new Event("library-sky-session-expired"));
          return;
        }
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

      const data = await response.json();

      // recordUri から handle と tid を抽出
      if (data.recordUri) {
        const parts = data.recordUri.split("/");
        const tid = parts[parts.length - 1];
        const handle = session.handle;
        const detailUrl = `/log/${handle}/${tid}?uri=${encodeURIComponent(data.recordUri)}`;
        setPostedLogUrl(detailUrl);
      }

      // Clear draft after successful submission
      clearDraft();
      setComment("");
      setNotice("Blueskyに投稿しました。");
    } catch (error) {
      setPostedLogUrl(null);
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
          読書ログを投稿するには<BlueskyLink asLink={false} />にログインしてください。
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900"
      >
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">読書ログを投稿</p>
        <p className="text-xs text-stone-600 dark:text-stone-400">
          読んだ本の情報と感想を<BlueskyLink asLink={false} />に投稿できます。
        </p>

        <div className="mb-3">

          <label className="space-y-2 text-xs font-medium text-stone-900 dark:text-stone-200">
            書籍名
            <div className="flex gap-1.5">
              <input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setSelectedAsin(null);
                  setAffiliateUrl("");
                }}
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
                  setAffiliateUrl(result.affiliateUrl || "");
                  setSearchResults([result]);
                  setSelectedAsin(result.asin);
                }}
                aria-pressed={selectedAsin === result.asin}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${selectedAsin === result.asin
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-300 dark:border-blue-500 dark:bg-stone-700 dark:ring-blue-700"
                  : "border-stone-200 bg-stone-50 hover:border-blue-300 hover:bg-blue-50 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-blue-700 dark:hover:bg-stone-700"
                  }`}
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
                <span
                  className={`text-xs font-medium ${selectedAsin === result.asin
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-blue-600 dark:text-blue-400"
                    }`}
                >
                  {selectedAsin === result.asin ? "選択中" : "選択"}
                </span>
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
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={(e) => {
                    const stars = e.currentTarget.parentElement?.querySelectorAll('button');
                    stars?.forEach((s, i) => {
                      s.style.opacity = i < star ? '1' : '0.3';
                    });
                  }}
                  onMouseLeave={(e) => {
                    const stars = e.currentTarget.parentElement?.querySelectorAll('button');
                    stars?.forEach((s, i) => {
                      s.style.opacity = i < rating ? '1' : '0.3';
                    });
                  }}
                  className="text-2xl transition-all duration-150 hover:scale-110"
                  style={{ opacity: star <= rating ? 1 : 0.3 }}
                >
                  ⭐️
                </button>
              ))}
            </div>
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

        {notice && (
          <div className="space-y-2">
            <p className="text-xs text-blue-600 dark:text-blue-400">{notice}</p>
            {postedLogUrl && (
              <Link
                href={postedLogUrl}
                className="inline-block text-xs text-blue-600 underline transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                投稿した読書ログを見る →
              </Link>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isPosting || !session}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPosting ? "投稿中..." : (<><BlueskyLink asLink={false} className="inline-flex items-center gap-1 text-white" />に投稿</>)}
        </button>
      </form>
    </section>
  );
}
