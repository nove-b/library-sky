import { NextRequest, NextResponse } from "next/server";
import { restoreOAuthSession } from "@/lib/blobs-store";
import { resumeOAuthSession } from "@/lib/bluesky";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Restore OAuth session from Netlify Blobs
 * Called by the client when a session cookie is missing but we still have session data stored
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { did } = body ?? {};

    if (!did) {
      return NextResponse.json(
        { error: "did is required" },
        { status: 400 }
      );
    }

    // Try to restore session from Blobs
    const storedSession = await restoreOAuthSession(did);
    if (!storedSession) {
      return NextResponse.json(
        { error: "Session not found in store" },
        { status: 401 }
      );
    }

    // Verify the stored tokens are still valid
    try {
      const resumedSession = await resumeOAuthSession({
        accessJwt: storedSession.accessJwt,
        refreshJwt: storedSession.refreshJwt,
        service: storedSession.service,
      });

      const response = NextResponse.json({
        handle: resumedSession.handle,
        did: resumedSession.did,
        accessJwt: resumedSession.accessJwt,
        refreshJwt: resumedSession.refreshJwt,
        displayName: storedSession.displayName,
        avatarUrl: storedSession.avatarUrl,
        service: storedSession.service,
      });

      // Re-set the cookie for another 7 days
      response.cookies.set(
        "bsky_session",
        JSON.stringify({
          handle: resumedSession.handle,
          did: resumedSession.did,
          displayName: storedSession.displayName,
          avatarUrl: storedSession.avatarUrl,
          service: storedSession.service,
          accessJwt: resumedSession.accessJwt,
          refreshJwt: resumedSession.refreshJwt,
        }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        }
      );

      return response;
    } catch (error) {
      console.error("Failed to resume OAuth session:", error);
      return NextResponse.json(
        { error: "Failed to resume session" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Restore session error:", error);
    return NextResponse.json(
      { error: "Failed to restore session" },
      { status: 500 }
    );
  }
}
