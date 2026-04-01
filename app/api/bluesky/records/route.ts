import { NextRequest, NextResponse } from "next/server";
import { createAgent, DEFAULT_BSKY_SERVICE } from "@/lib/bluesky";
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

const PAGE_LIMIT = 100;

interface ExtractedBookLog extends BookLog {
  postUri: string;
}

function extractRecordUriFromPost(post: Record<string, unknown>): string {
  const record = post.record as Record<string, unknown> | undefined;
  const recordFacets = record?.facets;
  if (!Array.isArray(recordFacets)) {
    return "";
  }

  for (const facet of recordFacets) {
    const facetObj = facet as Record<string, unknown>;
    const features = facetObj.features;
    if (!Array.isArray(features)) {
      continue;
    }

    for (const feature of features) {
      const featureObj = feature as Record<string, unknown>;
      if (
        featureObj.$type === "app.bsky.richtext.facet#link" &&
        typeof featureObj.uri === "string"
      ) {
        const linkUrl = featureObj.uri;
        if (!linkUrl.startsWith("http://") && !linkUrl.startsWith("https://")) {
          continue;
        }
        const queryString = linkUrl.split("?")[1];
        if (!queryString) {
          continue;
        }
        const uriParam = new URLSearchParams(queryString).get("uri");
        if (!uriParam) {
          continue;
        }
        try {
          const decoded = decodeURIComponent(uriParam);
          if (decoded.startsWith("at://")) {
            return decoded;
          }
        } catch {
          // Ignore decode errors and continue scanning remaining facets.
        }
      }
    }
  }

  return "";
}

function extractImageFromPostEmbed(post: Record<string, unknown>): string {
  const embedRecord = post.embed as Record<string, unknown> | undefined;
  const embedImages = embedRecord?.images;
  if (!Array.isArray(embedImages) || embedImages.length === 0) {
    return "";
  }

  const firstImage = embedImages[0] as Record<string, unknown>;
  const fullsize = firstImage?.fullsize;
  const thumb = firstImage?.thumb;
  if (typeof fullsize === "string") {
    return fullsize;
  }
  if (typeof thumb === "string") {
    return thumb;
  }
  return "";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const did = searchParams.get("did");
    const handle = searchParams.get("handle");
    const cursor = searchParams.get("cursor");

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

    let records: Array<{
      uri: string;
      cid: string;
      value: Record<string, unknown>;
    }> = [];
    let nextCursor: string | null = null;

    try {
      // listRecords is not implemented on some public appview hosts.
      // Use the PDS service endpoint for repo reads.
      const repoAgent = createAgent(DEFAULT_BSKY_SERVICE);
      const recordResponse = await repoAgent.com.atproto.repo.listRecords({
        repo: targetDid,
        collection: COLLECTION,
        limit: PAGE_LIMIT,
        ...(cursor ? { cursor } : {}),
      });

      records = (recordResponse.data.records ?? []) as Array<{
        uri: string;
        cid: string;
        value: Record<string, unknown>;
      }>;
      nextCursor = recordResponse.data.cursor ?? null;
    } catch (error) {
      console.warn("Failed to fetch lexicon records:", error);
    }

    // 投稿情報は補助的に1ページだけ取得して、レコードURIに紐づく投稿を引く
    const postByRecordUri = new Map<string, Record<string, unknown>>();
    try {
      const feedResponse = await agent.getAuthorFeed({
        actor: targetDid,
        limit: PAGE_LIMIT,
      });
      const posts = (feedResponse.data?.feed || []) as unknown as Array<{
        post?: Record<string, unknown>;
      }>;

      for (const item of posts) {
        if (!item?.post) {
          continue;
        }
        const recordUri = extractRecordUriFromPost(item.post);
        if (recordUri) {
          postByRecordUri.set(recordUri, item.post);
        }
      }
    } catch (error) {
      console.warn("Failed to fetch author feed:", error);
    }

    const validStatuses: ReadingStatus[] = ["want", "reading", "completed", "dropped"];

    const books: ExtractedBookLog[] = records
      .map((record) => {
        const value = record.value as Record<string, unknown>;
        const rawStatus = typeof value.status === "string" ? value.status : "reading";
        const mappedStatus = LABEL_TO_STATUS[rawStatus] || rawStatus;
        const finalStatus = validStatuses.includes(mappedStatus as ReadingStatus)
          ? (mappedStatus as ReadingStatus)
          : ("reading" as const);

        const linkedPost = postByRecordUri.get(record.uri);

        const fallbackPostImage = linkedPost ? extractImageFromPostEmbed(linkedPost) : "";

        const item: ExtractedBookLog = {
          uri: record.uri,
          cid: record.cid,
          title: typeof value.title === "string" ? value.title : "",
          author: typeof value.author === "string" ? value.author : "Unknown",
          imageUrl:
            typeof value.imageUrl === "string" && value.imageUrl
              ? value.imageUrl
              : fallbackPostImage,
          affiliateUrl: typeof value.affiliateUrl === "string" ? value.affiliateUrl : "",
          status: finalStatus,
          rating: typeof value.rating === "number" ? Math.min(Math.max(value.rating, 0), 5) : 0,
          comment: typeof value.comment === "string" ? value.comment : "",
          createdAt:
            typeof value.createdAt === "string"
              ? value.createdAt
              : new Date().toISOString(),
          postUri: linkedPost && typeof linkedPost.uri === "string" ? linkedPost.uri : "",
        };

        if (linkedPost) {
          if (typeof linkedPost.likeCount === "number") {
            item.likeCount = linkedPost.likeCount;
          }
          if (typeof linkedPost.replyCount === "number") {
            item.replyCount = linkedPost.replyCount;
          }
          if (typeof linkedPost.repostCount === "number") {
            item.repostCount = linkedPost.repostCount;
          }
        }

        return item;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return NextResponse.json({
      success: true,
      did: targetDid,
      books,
      count: books.length,
      nextCursor: books.length === PAGE_LIMIT ? nextCursor : null,
      hasMore: books.length === PAGE_LIMIT && Boolean(nextCursor),
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
