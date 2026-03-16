"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import BlueskyLink from "./BlueskyLink";
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

/**
 * Generate composite image with title on left and book cover on right using Canvas API
 */
async function generateCompositeImage(
  title: string,
  author: string,
  imageUrl: string,
  status: ReadingStatus,
  width = 1080,
  height = 567
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  const safeTitle = title.trim() || "Untitled";
  const safeAuthor = author.trim() || "Unknown Author";

  const padding = 42;
  const panelRadius = 28;
  const coverHeight = Math.floor((height - padding * 2) * 0.84);
  const coverWidth = Math.floor((coverHeight * 2) / 3);
  const coverRightInset = 20;
  const coverY = Math.floor((height - coverHeight) / 2);
  const coverX = width - padding - coverRightInset - coverWidth;
  const textAreaX = padding + 18;
  const textAreaY = padding + 44;
  const textWidth = coverX - textAreaX - 36;

  // Atmosphere with soft gradients.
  const backgroundGradient = ctx.createLinearGradient(0, 0, width, height);
  backgroundGradient.addColorStop(0, "#f8fafc");
  backgroundGradient.addColorStop(0.55, "#eef7ff");
  backgroundGradient.addColorStop(1, "#ecfeff");
  ctx.fillStyle = backgroundGradient;
  ctx.fillRect(0, 0, width, height);

  const glowLeft = ctx.createRadialGradient(170, 110, 20, 170, 110, 280);
  glowLeft.addColorStop(0, "rgba(56, 189, 248, 0.3)");
  glowLeft.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.fillStyle = glowLeft;
  ctx.fillRect(0, 0, width, height);

  const glowRight = ctx.createRadialGradient(width - 120, height - 130, 30, width - 120, height - 130, 290);
  glowRight.addColorStop(0, "rgba(16, 185, 129, 0.24)");
  glowRight.addColorStop(1, "rgba(16, 185, 129, 0)");
  ctx.fillStyle = glowRight;
  ctx.fillRect(0, 0, width, height);

  // Main content panel.
  drawRoundedRect(ctx, padding, padding, width - padding * 2, height - padding * 2, panelRadius);
  const panelGradient = ctx.createLinearGradient(padding, padding, padding, height - padding);
  panelGradient.addColorStop(0, "rgba(255, 255, 255, 0.92)");
  panelGradient.addColorStop(1, "rgba(255, 255, 255, 0.8)");
  ctx.fillStyle = panelGradient;
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header badge.
  const badgeText = "library-sky";
  ctx.font = "600 18px 'Avenir Next', 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  const badgeWidth = ctx.measureText(badgeText).width + 30;
  const badgeX = textAreaX;
  const badgeY = padding + 18;
  drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, 34, 17);
  ctx.fillStyle = "rgba(14, 165, 233, 0.12)";
  ctx.fill();
  ctx.fillStyle = "#0369a1";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, badgeX + 15, badgeY + 17);

  // Title block.
  ctx.fillStyle = "#0f172a";
  ctx.textBaseline = "top";
  ctx.font = "700 56px 'Avenir Next', 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  const titleLines = clampTextLines(ctx, wrapText(ctx, safeTitle, textWidth), 3, textWidth);
  let yOffset = textAreaY + 26;
  titleLines.forEach((line) => {
    ctx.fillText(line, textAreaX, yOffset);
    yOffset += 66;
  });

  yOffset += 16;
  ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
  ctx.fillRect(textAreaX, yOffset, textWidth - 20, 2);
  yOffset += 22;

  ctx.fillStyle = "#334155";
  ctx.font = "500 34px 'Avenir Next', 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  ctx.fillText(fitLineWithEllipsis(ctx, safeAuthor, textWidth), textAreaX, yOffset);

  // Footer status badge.

  const STATUS_LABELS: Record<ReadingStatus, string> = {
    want: "読みたい",
    reading: "読書中",
    completed: "読了",
    dropped: "中断",
  };

  const statusLabel = STATUS_LABELS[status];
  const statusBadgeY = height - padding - 62;
  const statusBadgeWidth = 150;
  const statusBadgeHeight = 42;

  drawRoundedRect(ctx, textAreaX, statusBadgeY, statusBadgeWidth, statusBadgeHeight, 21);
  const statusBadgeGradient = ctx.createLinearGradient(
    textAreaX,
    statusBadgeY,
    textAreaX + statusBadgeWidth,
    statusBadgeY + statusBadgeHeight
  );
  statusBadgeGradient.addColorStop(0, "rgba(14, 165, 233, 0.14)");
  statusBadgeGradient.addColorStop(1, "rgba(16, 185, 129, 0.14)");
  ctx.fillStyle = statusBadgeGradient;
  ctx.fill();

  ctx.strokeStyle = "rgba(56, 189, 248, 0.28)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#0284c7";
  ctx.beginPath();
  ctx.arc(textAreaX + 16, statusBadgeY + statusBadgeHeight / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.font = "600 20px 'Avenir Next', 'Hiragino Sans', 'Noto Sans JP', sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(statusLabel, textAreaX + 28, statusBadgeY + statusBadgeHeight / 2);

  // Cover image: clipped to rounded rectangle with soft shadow.
  const coverImage = await loadImage(imageUrl);
  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = coverWidth;
  offscreenCanvas.height = coverHeight;
  const offCtx = offscreenCanvas.getContext("2d");
  if (!offCtx) throw new Error("Failed to get offscreen canvas context");

  const imgAspect = coverImage.naturalWidth / coverImage.naturalHeight;
  const targetAspect = 2 / 3;

  let sx = 0, sy = 0, sw = coverImage.naturalWidth, sh = coverImage.naturalHeight;

  if (imgAspect > targetAspect) {
    sw = coverImage.naturalHeight * targetAspect;
    sx = (coverImage.naturalWidth - sw) / 2;
  } else {
    sh = coverImage.naturalWidth / targetAspect;
    sy = (coverImage.naturalHeight - sh) / 2;
  }

  offCtx.drawImage(coverImage, sx, sy, sw, sh, 0, 0, coverWidth, coverHeight);

  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.28)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  drawRoundedRect(ctx, coverX, coverY, coverWidth, coverHeight, 26);
  ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundedRect(ctx, coverX, coverY, coverWidth, coverHeight, 24);
  ctx.clip();
  ctx.drawImage(offscreenCanvas, coverX, coverY, coverWidth, coverHeight);
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, coverX, coverY, coverWidth, coverHeight, 24);
  ctx.stroke();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create blob from canvas"));
    }, "image/png");
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fitLineWithEllipsis(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let trimmed = text;
  while (trimmed.length > 0 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}...`;
}

function clampTextLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  maxLines: number,
  maxWidth: number
): string[] {
  if (lines.length <= maxLines) {
    return lines;
  }

  const clamped = lines.slice(0, maxLines);
  clamped[maxLines - 1] = fitLineWithEllipsis(ctx, clamped[maxLines - 1], maxWidth);
  return clamped;
}

/**
 * Helper function to wrap text
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const content = text.trim();
  if (!content) {
    return [];
  }

  const hasSpaces = /\s/.test(content);
  const units = hasSpaces ? content.split(/\s+/) : Array.from(content);
  const lines: string[] = [];
  let currentLine = "";

  units.forEach((unit) => {
    const testLine = currentLine
      ? hasSpaces
        ? `${currentLine} ${unit}`
        : `${currentLine}${unit}`
      : unit;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = unit;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Load image from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.crossOrigin = "anonymous";
    img.src = `/api/image-proxy?url=${encodeURIComponent(url)}`;
  });
}

/**
 * Convert Blob to Base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
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
  const [postedLogUrl, setPostedLogUrl] = useState<string | null>(null);

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

      // Generate composite image on client side
      let compositeImageBase64: string | undefined;
      if (imageUrl.trim()) {
        try {
          const compositeBlob = await generateCompositeImage(
            title.trim(),
            author.trim(),
            imageUrl.trim(),
            status.trim() as ReadingStatus
          );
          compositeImageBase64 = await blobToBase64(compositeBlob);
        } catch (compositeError) {
          console.warn("[LogComposer] Failed to generate composite image:", compositeError);
          // Continue without composite image - API will handle it
        }
      }

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
          compositeImageBase64,
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
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
