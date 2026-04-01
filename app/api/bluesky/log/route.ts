import { NextRequest, NextResponse } from "next/server";
import type { Agent } from "@atproto/api";
import type { Book, ReadingStatus } from "@/lib/types";
import {
  createAgent,
  DEFAULT_BSKY_SERVICE,
  refreshSession,
} from "@/lib/bluesky";
import { createOAuthAgent, getOAuthStoredTokens, OAuthSessionExpiredError } from "@/lib/oauth-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION =
  process.env.NEXT_PUBLIC_BSKY_COLLECTION || "com.library-sky.bookLog";
const STATUS_LABELS: Record<ReadingStatus, string> = {
  want: "読みたい",
  reading: "読書中",
  completed: "読了",
  dropped: "中断",
};

function decodeDidFromJwt(accessJwt: string) {
  const jwtParts = accessJwt.split(".");
  if (jwtParts.length !== 3) {
    throw new Error("Invalid JWT format");
  }
  const decodedPayload = Buffer.from(jwtParts[1], "base64").toString("utf-8");
  const payload = JSON.parse(decodedPayload) as { sub?: string; handle?: string };
  if (!payload.sub) {
    throw new Error("No DID in JWT");
  }
  return { did: payload.sub, handle: payload.handle ?? "" };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessJwt, refreshJwt, did, book, status, rating, comment, service, handle } =
      body ?? {};

    let effectiveAccessJwt =
      typeof accessJwt === "string" ? accessJwt.trim() : "";
    let effectiveRefreshJwt =
      typeof refreshJwt === "string" ? refreshJwt.trim() : "";
    let effectiveDid = typeof did === "string" ? did.trim() : "";
    let effectiveHandle = typeof handle === "string" ? handle.trim() : "";
    let isOAuthSession = false;

    const oauthDidFromAccess = effectiveAccessJwt.startsWith("oauth:")
      ? effectiveAccessJwt.slice("oauth:".length).trim()
      : "";
    const oauthDidFromRefresh = effectiveRefreshJwt.startsWith("oauth:")
      ? effectiveRefreshJwt.slice("oauth:".length).trim()
      : "";
    const oauthDid = oauthDidFromAccess || oauthDidFromRefresh;

    if (oauthDid) {
      isOAuthSession = true;
      effectiveDid = effectiveDid || oauthDid;
      const oauthTokens = getOAuthStoredTokens(oauthDid);
      if (oauthTokens) {
        effectiveAccessJwt = oauthTokens.accessJwt;
        effectiveRefreshJwt = oauthTokens.refreshJwt || effectiveRefreshJwt;
      }
    }

    if ((!effectiveAccessJwt || !effectiveDid) && effectiveRefreshJwt) {
      try {
        const refreshed = await refreshSession({
          refreshJwt: effectiveRefreshJwt,
          service: service ?? DEFAULT_BSKY_SERVICE,
        });
        effectiveAccessJwt = refreshed.accessJwt || effectiveAccessJwt;
        effectiveDid = refreshed.did || effectiveDid;
        effectiveHandle = refreshed.handle || effectiveHandle;
      } catch (refreshError) {
        console.warn("[POST] Failed to refresh session before posting:", refreshError);
      }
    }

    const missingFields = [
      !effectiveAccessJwt ? "accessJwt" : null,
      !effectiveDid ? "did" : null,
      !book ? "book" : null,
      !status ? "status" : null,
      typeof rating !== "number" ? "rating" : null,
    ].filter((field): field is string => Boolean(field));

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Required fields are missing",
          missingFields,
        },
        { status: 400 }
      );
    }

    let jwtDid: string;
    let jwtHandle = effectiveHandle;
    try {
      const decoded = decodeDidFromJwt(effectiveAccessJwt);
      jwtDid = decoded.did;
      // JWTにハンドルが含まれていない場合は、リクエストボディから取得
      if (!jwtHandle && decoded.handle) {
        jwtHandle = decoded.handle;
      }
    } catch (error) {
      if (isOAuthSession && effectiveDid) {
        jwtDid = effectiveDid;
      } else {
        console.error("[POST] JWT decode failed:", error);
        return NextResponse.json(
          { error: "Invalid authentication token" },
          { status: 401 }
        );
      }
    }

    if (effectiveDid && jwtDid !== effectiveDid) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    if (!jwtHandle) {
      return NextResponse.json(
        { error: "Handle is required but not available" },
        { status: 400 }
      );
    }

    let agent: Agent;
    if (isOAuthSession) {
      try {
        agent = await createOAuthAgent(jwtDid);
      } catch (error) {
        if (error instanceof OAuthSessionExpiredError) {
          return NextResponse.json(
            { error: "Session has expired. Please log in again." },
            { status: 401 }
          );
        }
        throw error;
      }
    } else {
      const credentialAgent = createAgent(service ?? DEFAULT_BSKY_SERVICE);
      await credentialAgent.resumeSession({
        accessJwt: effectiveAccessJwt,
        refreshJwt: effectiveRefreshJwt,
        did: jwtDid,
        handle: jwtHandle,
        active: true,
      });
      agent = credentialAgent;
    }

    const now = new Date().toISOString();

    // 画像をアップロード（独自Lexiconと投稿の両方で使用）
    let imageBlob: { ref: { $link: string }; mimeType: string; size: number } | undefined;
    if ((book as Book).imageUrl) {
      try {
        const imageResponse = await fetch((book as Book).imageUrl);
        if (imageResponse.ok) {
          const contentType = imageResponse.headers.get("content-type") ?? "";
          if (contentType.startsWith("image/")) {
            const imageBuffer = await imageResponse.arrayBuffer();
            const uploaded = await agent.uploadBlob(new Uint8Array(imageBuffer), {
              encoding: contentType,
            });
            imageBlob = uploaded.data.blob;
          }
        }
      } catch (error) {
        console.warn("[POST] Failed to upload image:", error);
      }
    }

    const recordResponse = await agent.com.atproto.repo.createRecord({
      repo: jwtDid,
      collection: COLLECTION,
      record: {
        $type: COLLECTION,
        title: (book as Book).title,
        author: (book as Book).author,
        imageUrl: (book as Book).imageUrl,
        affiliateUrl: (book as Book).affiliateUrl || "",
        status,
        rating,
        comment: typeof comment === "string" ? comment : "",
        createdAt: now,
      },
    });

    const recordUri = recordResponse.data.uri;

    // recordUri から tid を抽出
    const tid = recordUri.split("/").pop() || "";

    const statusLabel = STATUS_LABELS[status as ReadingStatus] ?? String(status);
    let safeComment = typeof comment === "string" ? comment.trim() : "";
    if (safeComment.length > 100) {
      safeComment = safeComment.substring(0, 100) + "...";
    }
    const ratingStars = "⭐".repeat(Math.max(0, Math.min(rating, 5)));
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "http://127.0.0.1:3000";

    // レコードURI をエンコードしてURLに含める
    const encodedRecordUri = encodeURIComponent(recordUri);
    const detailUrlWithUri = `${baseUrl}/log/${jwtHandle}/${tid}?uri=${encodedRecordUri}`;

    const lines = [
      `📚【${statusLabel}】${(book as Book).title}`,
      `✍️ 著者: ${(book as Book).author}`,
      ratingStars ? `${ratingStars} ${rating}/5` : "",
      safeComment ? `💬 感想: ${safeComment}` : "",
      `🔗 library-sky`,
    ].filter(Boolean);

    const text = lines.join("\n");

    // facetsを手動で構築してカスタムリンクテキストを作成
    const linkText = "library-sky";
    const linkStart = text.indexOf(linkText);

    // バイト位置を計算（UTF-8エンコーディング）
    const encoder = new TextEncoder();
    const beforeLink = text.substring(0, linkStart);
    const beforeLinkBytes = encoder.encode(beforeLink);
    const linkBytes = encoder.encode(linkText);

    const facets = [
      {
        index: {
          byteStart: beforeLinkBytes.length,
          byteEnd: beforeLinkBytes.length + linkBytes.length,
        },
        features: [
          {
            $type: "app.bsky.richtext.facet#link",
            uri: detailUrlWithUri,
          },
        ],
      },
    ];

    // 既にアップロードされた画像blobを使用して埋め込みを作成
    const imageEmbed = imageBlob
      ? {
        $type: "app.bsky.embed.images",
        images: [
          {
            image: imageBlob,
            alt: `${(book as Book).title} の書影`,
          },
        ],
      }
      : undefined;

    const postResponse = await agent.com.atproto.repo.createRecord({
      repo: jwtDid,
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text,
        langs: ["ja"],
        facets,
        ...(imageEmbed ? { embed: imageEmbed } : {}),
        createdAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      recordUri,
      postUri: postResponse.data.uri,
    });
  } catch (error) {
    console.error("Failed to post to Bluesky:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Failed to post to Bluesky: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { uri, postUri, accessJwt, refreshJwt, did } = body ?? {};

    if (!uri || !accessJwt) {
      return NextResponse.json(
        { error: "uri and accessJwt are required" },
        { status: 400 }
      );
    }

    let effectiveAccessJwt =
      typeof accessJwt === "string" ? accessJwt.trim() : "";
    let effectiveRefreshJwt =
      typeof refreshJwt === "string" ? refreshJwt.trim() : "";
    let effectiveDid = typeof did === "string" ? did.trim() : "";
    let isOAuthSession = false;

    const oauthDidFromAccess = effectiveAccessJwt.startsWith("oauth:")
      ? effectiveAccessJwt.slice("oauth:".length).trim()
      : "";
    const oauthDidFromRefresh = effectiveRefreshJwt.startsWith("oauth:")
      ? effectiveRefreshJwt.slice("oauth:".length).trim()
      : "";
    const oauthDid = oauthDidFromAccess || oauthDidFromRefresh;

    if (oauthDid) {
      isOAuthSession = true;
      effectiveDid = effectiveDid || oauthDid;
      const oauthTokens = getOAuthStoredTokens(oauthDid);
      if (oauthTokens) {
        effectiveAccessJwt = oauthTokens.accessJwt;
        effectiveRefreshJwt = oauthTokens.refreshJwt || effectiveRefreshJwt;
      }
    }

    let currentUserDid: string;
    let currentHandle = "";
    try {
      const decoded = decodeDidFromJwt(effectiveAccessJwt);
      currentUserDid = decoded.did;
      currentHandle = decoded.handle;
    } catch (error) {
      if (isOAuthSession && effectiveDid) {
        currentUserDid = effectiveDid;
        currentHandle = "";
      } else {
        console.error("[DELETE] JWT decode failed:", error);
        return NextResponse.json(
          { error: "Invalid authentication token" },
          { status: 401 }
        );
      }
    }

    let recordUri = uri;
    if (recordUri.includes("at://")) {
      recordUri = recordUri.substring(recordUri.indexOf("at://"));
    }

    const match = recordUri.match(/^at:\/\/([^/]+)\/(.+?)\/([^/]+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid record URI format" },
        { status: 400 }
      );
    }

    const [, recordDid, collection, rkey] = match;

    if (recordDid !== currentUserDid) {
      return NextResponse.json(
        { error: "Unauthorized: you can only delete your own posts" },
        { status: 403 }
      );
    }

    let agent: Agent;
    if (isOAuthSession) {
      try {
        agent = await createOAuthAgent(currentUserDid);
      } catch (error) {
        if (error instanceof OAuthSessionExpiredError) {
          return NextResponse.json(
            { error: "Session has expired. Please log in again." },
            { status: 401 }
          );
        }
        throw error;
      }
    } else {
      const credentialAgent = createAgent(DEFAULT_BSKY_SERVICE);

      try {
        await credentialAgent.resumeSession({
          accessJwt: effectiveAccessJwt,
          refreshJwt: effectiveRefreshJwt ?? "",
          did: currentUserDid,
          handle: currentHandle,
          active: true,
        });
      } catch (sessionError) {
        console.error("[DELETE] Session resume failed:", sessionError);
        return NextResponse.json(
          { error: "Session has expired. Please log in again." },
          { status: 401 }
        );
      }

      agent = credentialAgent;
    }

    // Delete lexicon record
    try {
      await agent.com.atproto.repo.deleteRecord({
        repo: recordDid,
        collection,
        rkey,
      });
    } catch (recordError) {
      console.error("[DELETE] Lexicon record deletion failed:", recordError);
      // Continue to delete post even if record deletion fails
    }

    // Delete post if postUri is provided
    if (postUri) {
      try {
        // postUri format: at://did/collection/rkey
        const postMatch = postUri.match(/^at:\/\/([^\/]+)\/(.+?)\/([^\/]+)$/);
        if (postMatch) {
          const [, postDid, postCollection, postRkey] = postMatch;
          await agent.com.atproto.repo.deleteRecord({
            repo: postDid,
            collection: postCollection,
            rkey: postRkey,
          });
        }
      } catch (postError) {
        console.error("[DELETE] Post deletion failed:", postError);
        // Don't fail the entire operation if post deletion fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Log deleted successfully",
    });
  } catch (error) {
    console.error("[DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete log" },
      { status: 500 }
    );
  }
}
