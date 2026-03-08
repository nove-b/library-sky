import { NextRequest, NextResponse } from "next/server";
import { createAgent } from "@/lib/bluesky";
import type { BookLog, ReadingStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APPVIEW_SERVICE =
  process.env.NEXT_PUBLIC_BSKY_APPVIEW_SERVICE || "https://public.api.bsky.app";
const COLLECTION =
  process.env.NEXT_PUBLIC_BSKY_COLLECTION || "com.library-sky.bookLog";

// ステータスラベル（日本語）から英語キーへの逆マッピング
const LABEL_TO_STATUS: Record<string, ReadingStatus> = {
  "読みたい": "want",
  "読書中": "reading",
  "読了": "completed",
  "中断": "dropped",
};

interface ExtractedBookLog extends BookLog {
  postUri: string;
}

interface BlueskyPost {
  uri?: string;
  cid?: string;
  record?: Record<string, unknown>;
  author?: Record<string, unknown>;
  embed?: Record<string, unknown>;
}

function parseBookLogFromPost(post: BlueskyPost): ExtractedBookLog | null {
  const text = typeof post.record?.text === "string" ? post.record.text : "";

  // 📚【ステータス】タイトル 形式を検出
  const match = text.match(/📚【(.+?)】(.+?)\n/);
  if (!match) return null;

  const status = match[1];
  const title = match[2];

  // 著者情報を抽出
  const authorMatch = text.match(/✍️ 著者: (.+?)(\n|$)/);
  const author = authorMatch ? authorMatch[1] : "Unknown";

  // コメント情報を抽出（投稿テキストから省略版を初期値として抽出）
  const commentMatch = text.match(/💬 感想: (.+?)(\n|$)/);
  const comment = commentMatch ? commentMatch[1] : "";

  // まず、📌 で始まるレコードURI行を探す
  const recordUriMatch = text.match(/📌 (at:\/\/.+?)(\n|$)/);
  let uri = recordUriMatch ? recordUriMatch[1].trim() : "";

  // レコードURIが見つからない場合は、facetsまたは🔗のURLから抽出を試みる
  if (!uri) {
    // facetsからURLを探す
    const recordFacets = post.record?.facets;
    if (Array.isArray(recordFacets)) {
      for (const facet of recordFacets) {
        const facetObj = facet as Record<string, unknown>;
        const features = facetObj.features;
        if (Array.isArray(features)) {
          for (const feature of features) {
            const featureObj = feature as Record<string, unknown>;
            if (featureObj.$type === "app.bsky.richtext.facet#link" && typeof featureObj.uri === "string") {
              const facetUri = featureObj.uri;
              if (facetUri.startsWith('http://') || facetUri.startsWith('https://')) {
                const queryString = facetUri.split('?')[1];
                if (queryString) {
                  const uriParam = new URLSearchParams(queryString).get('uri');
                  if (uriParam) {
                    try {
                      uri = decodeURIComponent(uriParam);
                      break;
                    } catch {
                      uri = "";
                    }
                  }
                }
              }
            }
          }
          if (uri) break;
        }
      }
    }

    // facetsで見つからない場合は、🔗からURLを抽出
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
  }

  // URI が有効な形式でない場合は、デフォルト値を使用
  if (!uri.startsWith('at://')) {
    const authorDid = typeof (post.author as Record<string, unknown>)?.did === "string" ? (post.author as Record<string, unknown>).did : "unknown";
    const postUri = typeof post.uri === "string" ? post.uri : "unknown";
    uri = `at://${authorDid}/${postUri}`;
  }

  // レーティングを抽出（⭐ の個数）
  const ratingMatch = text.match(/⭐/g);
  const rating = ratingMatch ? ratingMatch.length : 0;

  // Amazon URL が facets に含まれている可能性があるため、text から抽出
  // 画像URLを抽出（embedから取得）
  let imageUrl = "";
  const embedRecord = post.embed as Record<string, unknown>;
  const embedImages = embedRecord?.images;
  if (Array.isArray(embedImages) && embedImages.length > 0) {
    const firstImage = embedImages[0] as Record<string, unknown>;
    const fullsize = firstImage?.fullsize;
    const thumb = firstImage?.thumb;
    if (typeof fullsize === "string" || typeof thumb === "string") {
      imageUrl = (typeof fullsize === "string" ? fullsize : "") || (typeof thumb === "string" ? thumb : "");
      console.log('[DEBUG] imageUrl from embed:', imageUrl);
    }
  }

  const authorDid = typeof (post.author as Record<string, unknown>)?.did === "string" ? (post.author as Record<string, unknown>).did : "unknown";
  const postUri = typeof post.uri === "string" ? post.uri : "unknown";
  const postCid = typeof post.cid === "string" ? post.cid : "";
  const createdAt = typeof post.record?.createdAt === "string" ? post.record.createdAt : new Date().toISOString();

  // 日本語ラベルを英語キーに変換
  const statusKey = LABEL_TO_STATUS[status] || status;

  // Validate status is a valid ReadingStatus
  const validStatuses: ReadingStatus[] = ["want", "reading", "completed", "dropped"];
  const finalStatus = validStatuses.includes(statusKey as ReadingStatus) ? (statusKey as ReadingStatus) : ("reading" as const);

  return {
    uri: uri || `at://${authorDid}/${postUri}`,
    cid: postCid,
    title,
    author,
    imageUrl,
    status: finalStatus,
    rating: Math.min(rating, 5),
    comment,
    createdAt,
    postUri,
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

        // Add engagement metrics from post
        const post = item.post as Record<string, unknown>;
        if (typeof post.likeCount === 'number') {
          parsed.likeCount = post.likeCount;
        }
        if (typeof post.replyCount === 'number') {
          parsed.replyCount = post.replyCount;
        }
        if (typeof post.repostCount === 'number') {
          parsed.repostCount = post.repostCount;
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
          console.log('[DEBUG] Record found for URI:', parsed.uri);
          console.log('[DEBUG] Record found:', JSON.stringify(record, null, 2));
        } else {
          console.log('[DEBUG] Record NOT found for URI:', parsed.uri);
          console.log('[DEBUG] Available recordMap keys:', Array.from(recordMap.keys()).slice(0, 5));
        }

        if (record && typeof record === 'object') {
          const typedRecord = record as Record<string, unknown>;
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
            parsed.status = typedRecord.status as ReadingStatus;
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
