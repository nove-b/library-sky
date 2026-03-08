import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/oauth-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const handle =
      request.nextUrl.searchParams.get("handle") || "";

    const oauthClient = getOAuthClient();
    const url = await oauthClient.authorize(handle || "https://bsky.social", {
      scope: "atproto transition:generic",
    });

    return NextResponse.redirect(url.toString());
  } catch (error) {
    console.error("OAuth authorize error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
