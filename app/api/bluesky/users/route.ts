import { NextResponse } from "next/server";
import { createAgent } from "@/lib/bluesky";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APPVIEW_SERVICE =
  process.env.NEXT_PUBLIC_BSKY_APPVIEW_SERVICE || "https://public.api.bsky.app";
const SEARCH_QUERY = "library-sky";
const SEARCH_LIMIT = 100;

interface UserProfile {
  handle: string;
  displayName: string;
  avatarUrl: string;
  did: string;
}

export async function GET() {
  try {
    const agent = createAgent(APPVIEW_SERVICE);

    const searchResponse = await agent.app.bsky.feed.searchPosts({
      q: SEARCH_QUERY,
      limit: SEARCH_LIMIT,
    });

    const posts = searchResponse.data.posts ?? [];

    const seenDids = new Set<string>();
    const users: UserProfile[] = [];

    for (const post of posts) {
      const author = post.author;
      if (!author?.did || seenDids.has(author.did)) {
        continue;
      }
      seenDids.add(author.did);
      users.push({
        did: author.did,
        handle: author.handle,
        displayName: author.displayName || author.handle,
        avatarUrl: author.avatar || "",
      });
    }

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
