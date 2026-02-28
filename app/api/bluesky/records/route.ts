import { NextRequest, NextResponse } from "next/server";
import { createAgent } from "@/lib/bluesky";
import type { BookLog } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APPVIEW_SERVICE =
  process.env.NEXT_PUBLIC_BSKY_APPVIEW_SERVICE || "https://public.api.bsky.app";
const COLLECTION =
  process.env.NEXT_PUBLIC_BSKY_COLLECTION || "com.library-sky.bookLog";

interface ExtractedBookLog extends BookLog {
  postUri: string;
}

function parseBookLogFromPost(post: Record<string, any>): ExtractedBookLog | null {
  const text = post.record?.text || "";

  // 📚【ステータス】タイトル 形式を検出
  const match = text.match(/📚【(.+?)】(.+?)\n/);
  if (!match) return null;

  const status = match[1];
  const title = match[2];

  // 著者情報を抽出
  const authorMatch = text.match(/✍️ 著者: (.+?)(\n|$)/);
  const author = authorMatch ? authorMatch[1] : "Unknown";

  // コメント情報を抽出
  const commentMatch = text.match(/💬 感想: (.+?)(\n|$)/);
  const comment = commentMatch ? commentMatch[1] : "";

  // まず、📌 で始まるレコードURI行を探す
  const recordUriMatch = text.match(/📌 (at:\/\/.+?)(\n|$)/);
  let uri = recordUriMatch ? recordUriMatch[1].trim() : "";

  // レコードURIが見つからない場合は、🔗 のURLから抽出を試みる
  if (!uri) {
    const urlMatch = text.match(/🔗 (.+?)(\n|$)/);
    const urlOrBrowserUrl = urlMatch ? urlMatch[1].trim() : "";

    if (urlOrBrowserUrl.startsWith('http://') || urlOrBrowserUrl.startsWith('https://')) {
      // URLクエリパラメータから記録URIを抽出
      const queryString = urlOrBrowserUrl.split('?')[1];
      if (queryString) {
        const uriParam = new URLSearchParams(queryString).get('uri');
        if (uriParam) {
          try {
            uri = decodeURIComponent(uriParam);
          } catch {
            uri = "";
          }
        }
      }
    }
  }

  // URI が有効な形式でない場合は、デフォルト値を使用
  if (!uri.startsWith('at://')) {
    uri = `at://${post.author?.did}/${post.uri}`;
  }

  // レーティングを抽出（⭐ の個数）
  const ratingMatch = text.match(/⭐/g);
  const rating = ratingMatch ? ratingMatch.length : 0;

  // Amazon URL が facets に含まれている可能性があるため、text から抽出
  const amazonMatch = text.match(
    /https?:\/\/(www\.)?amazon\.[a-z.]+\/.*?(?=\s|$)/
  );
  const amazonUrl = amazonMatch ? amazonMatch[0] : "";

  // 画像URLを抽出（embedから取得）
  let imageUrl = "";
  if (post.embed?.images && Array.isArray(post.embed.images) && post.embed.images.length > 0) {
    const firstImage = post.embed.images[0];
    if (firstImage?.fullsize || firstImage?.thumb) {
      imageUrl = firstImage.fullsize || firstImage.thumb || "";
      console.log('[DEBUG] imageUrl from embed:', imageUrl);
    }
  }

  return {
    uri: uri || `at://${post.author?.did}/unknown`,
    cid: post.cid || "",
    title,
    author,
    amazonUrl,
    imageUrl,
    status: status || ("reading" as const),
    rating: Math.min(rating, 5),
    comment,
    createdAt: post.record?.createdAt || new Date().toISOString(),
    postUri: post.uri,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const did = searchParams.get("did");
    const handle = searchParams.get("handle");

    if (!did && !handle) {
      return NextResponse.json(
        { error: "did or handle parameter is required" },
        { status: 400 }
      );
    }

    // Use the public appview for read-only endpoints (no auth required).
    const agent = createAgent(APPVIEW_SERVICE);

    // ユーザーのプロフィールを取得
    let targetDid = did;
    if (handle) {
      const profile = await agent.getProfile({ actor: handle });
      targetDid = profile.data.did;
    }

    if (!targetDid) {
      return NextResponse.json(
        { error: "Could not resolve user DID" },
        { status: 404 }
      );
    }

    const recordMap = new Map<string, Record<string, unknown>>();
    try {
      const recordResponse = await agent.com.atproto.repo.listRecords({
        repo: targetDid,
        collection: COLLECTION,
        limit: 100,
      });
      for (const record of recordResponse.data.records ?? []) {
        recordMap.set(record.uri, record.value);
        recordMap.set((record.uri as string).split('/').pop() || '', record.value);
      }
    } catch (error) {
      console.warn("Failed to fetch lexicon records:", error);
    }

    // ユーザーのフィードを取得
    const feedResponse = await agent.getAuthorFeed({
      actor: targetDid,
      limit: 100,
    });

    const posts = (feedResponse.data?.feed || []) as unknown as Array<{
      post: Record<string, unknown>;
    }>;

    // Posts から書籍ログを抽出
    const books: ExtractedBookLog[] = posts
      .map((item) => {
        const parsed = parseBookLogFromPost(item.post);
        if (!parsed) {
          return null;
        }

        // Try to match record by full URI first, then by TID
        let record = recordMap.get(parsed.uri);
        if (!record && parsed.uri) {
          const tid = parsed.uri.split('/').pop();
          if (tid) {
            record = recordMap.get(tid);
          }
        }

        // Debug: レコードの内容を確認
        if (record) {
          console.log('[DEBUG] Record found:', JSON.stringify(record, null, 2));
        }

        if (record && typeof record === 'object') {
          const typedRecord = record as Record<string, unknown>;
          if (typeof typedRecord.amazonUrl === 'string') {
            parsed.amazonUrl = typedRecord.amazonUrl;
          }
          if (typeof typedRecord.imageUrl === 'string' && !parsed.imageUrl) {
            parsed.imageUrl = typedRecord.imageUrl;
            console.log('[DEBUG] imageUrl from record:', typedRecord.imageUrl);
          }
          if (typeof typedRecord.title === 'string') {
            parsed.title = typedRecord.title;
          }
          if (typeof typedRecord.author === 'string') {
            parsed.author = typedRecord.author;
          }
          if (typeof typedRecord.status === 'string') {
            parsed.status = typedRecord.status as any;
          }
          if (typeof typedRecord.rating === "number") {
            parsed.rating = typedRecord.rating;
          }
          if (typeof typedRecord.comment === "string") {
            parsed.comment = typedRecord.comment;
          }
          if (typeof typedRecord.createdAt === 'string') {
            parsed.createdAt = typedRecord.createdAt;
          }
        }
        return parsed;
      })
      .filter((book): book is ExtractedBookLog => book !== null)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return NextResponse.json({
      success: true,
      did: targetDid,
      books,
      count: books.length,
    });
  } catch (error) {
    console.error("Failed to fetch records:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Failed to fetch records: ${message}` },
      { status: 500 }
    );
  }
}
