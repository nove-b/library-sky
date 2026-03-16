import { NextRequest, NextResponse } from "next/server";
import { logoutSession } from "@/lib/bluesky";
import { deleteOAuthSession } from "@/lib/blobs-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId, did } = body ?? {};

    if (typeof sessionId === "string" && sessionId) {
      logoutSession(sessionId);
    }

    // Delete from Blobs if DID is provided
    if (typeof did === "string" && did) {
      await deleteOAuthSession(did);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete("bsky_session");
    return response;
  } catch {
    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
}
