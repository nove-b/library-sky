import { NextRequest, NextResponse } from "next/server";
import { createAgent } from "@/lib/bluesky";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APPVIEW_SERVICE =
  process.env.NEXT_PUBLIC_BSKY_APPVIEW_SERVICE || "https://public.api.bsky.app";

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

    // Use the public appview for read-only profile lookups.
    const agent = createAgent(APPVIEW_SERVICE);

    const profile = await agent.getProfile({
      actor: did || (handle as string),
    });

    return NextResponse.json({
      success: true,
      did: profile.data.did,
      handle: profile.data.handle,
      displayName: profile.data.displayName || profile.data.handle,
      avatar: profile.data.avatar,
      description: profile.data.description,
      postsCount: profile.data.postsCount,
      followersCount: profile.data.followersCount,
      followsCount: profile.data.followsCount,
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
