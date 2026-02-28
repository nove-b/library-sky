import { NextRequest, NextResponse } from "next/server";
import { createAgent, loginToBluesky } from "@/lib/bluesky";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APPVIEW_SERVICE =
  process.env.NEXT_PUBLIC_BSKY_APPVIEW_SERVICE || "https://public.api.bsky.app";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handle, appPassword, service } = body ?? {};

    if (!handle || !appPassword) {
      return NextResponse.json(
        { error: "handle and appPassword are required" },
        { status: 400 }
      );
    }

    const result = await loginToBluesky({
      identifier: handle,
      password: appPassword,
      service,
    });

    let displayName = result.profile.handle;
    let avatarUrl = "";

    try {
      const appviewAgent = createAgent(APPVIEW_SERVICE);
      const profile = await appviewAgent.getProfile({
        actor: result.profile.did,
      });
      displayName =
        profile.data.displayName || profile.data.handle || displayName;
      avatarUrl = profile.data.avatar || "";
    } catch (profileError) {
      console.warn("Failed to fetch profile avatar:", profileError);
    }

    return NextResponse.json({
      handle: result.profile.handle,
      did: result.profile.did,
      accessJwt: result.profile.accessJwt,
      refreshJwt: result.profile.refreshJwt,
      displayName,
      avatarUrl,
      service: result.service,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Failed to connect to Bluesky" },
      { status: 401 }
    );
  }
}
