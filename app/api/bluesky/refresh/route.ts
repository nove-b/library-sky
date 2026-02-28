import { NextRequest, NextResponse } from "next/server";
import { createAgent, refreshSession } from "@/lib/bluesky";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APPVIEW_SERVICE =
  process.env.NEXT_PUBLIC_BSKY_APPVIEW_SERVICE || "https://public.api.bsky.app";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshJwt, service } = body ?? {};

    if (!refreshJwt) {
      return NextResponse.json(
        { error: "refreshJwt is required" },
        { status: 400 }
      );
    }

    const result = await refreshSession({
      refreshJwt,
      service,
    });

    let displayName = result.handle;
    let avatarUrl = "";

    try {
      const appviewAgent = createAgent(APPVIEW_SERVICE);
      const profile = await appviewAgent.getProfile({
        actor: result.did || result.handle,
      });
      displayName =
        profile.data.displayName || profile.data.handle || displayName;
      avatarUrl = profile.data.avatar || "";
    } catch (profileError) {
      console.warn("Failed to fetch profile avatar:", profileError);
    }

    return NextResponse.json({
      handle: result.handle,
      did: result.did,
      accessJwt: result.accessJwt,
      refreshJwt: result.refreshJwt,
      displayName,
      avatarUrl,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh session" },
      { status: 401 }
    );
  }
}
