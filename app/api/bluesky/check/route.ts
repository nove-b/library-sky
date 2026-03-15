import { NextRequest, NextResponse } from "next/server";
import { createOAuthAgent, OAuthSessionExpiredError } from "@/lib/oauth-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("bsky_session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const sessionData = JSON.parse(sessionCookie) as {
      accessJwt?: string;
      did?: string;
    };

    // Non-OAuth sessions don't need this check
    if (!sessionData.accessJwt?.startsWith("oauth:")) {
      return NextResponse.json({ valid: true });
    }

    const oauthDid =
      sessionData.did ||
      sessionData.accessJwt.slice("oauth:".length).trim();

    await createOAuthAgent(oauthDid);
    return NextResponse.json({ valid: true });
  } catch (error) {
    if (error instanceof OAuthSessionExpiredError) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }
    return NextResponse.json({ error: "Session check failed" }, { status: 401 });
  }
}
