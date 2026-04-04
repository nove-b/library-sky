import { NextResponse } from "next/server";
import { createAgent } from "@/lib/bluesky";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APPVIEW_SERVICE =
  process.env.NEXT_PUBLIC_BSKY_APPVIEW_SERVICE || "https://public.api.bsky.app";
const FEED_URI = "at://did:plc:2atly2y5kfyjcj5zap6pv4wd/app.bsky.feed.generator/aaaf7ciexzdpw";
const FEED_LIMIT = 100;

interface UserProfile {
  handle: string;
  displayName: string;
  avatarUrl: string;
  did: string;
  latestPostAt: string;
}

export async function GET() {
  try {
    const agent = createAgent(APPVIEW_SERVICE);

    const feedResponse = await agent.app.bsky.feed.getFeed({
      feed: FEED_URI,
      limit: FEED_LIMIT,
    });

    const feedItems = feedResponse.data.feed ?? [];

    const userMap = new Map<string, UserProfile>();

    for (const item of feedItems) {
      const author = item.post?.author;
      const indexedAt = item.post?.indexedAt;
      if (!author?.did || !indexedAt) {
        continue;
      }
      const existing = userMap.get(author.did);
      if (!existing || indexedAt > existing.latestPostAt) {
        userMap.set(author.did, {
          did: author.did,
          handle: author.handle,
          displayName: author.displayName || author.handle,
          avatarUrl: author.avatar || "",
          latestPostAt: indexedAt,
        });
      }
    }

    const users = Array.from(userMap.values()).sort(
      (a, b) => b.latestPostAt.localeCompare(a.latestPostAt)
    );

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Failed to fetch users: ${message}` },
      { status: 500 }
    );
  }
}
