import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("bsky_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "No session found" },
        { status: 401 }
      );
    }

    const sessionData = JSON.parse(sessionCookie);

    // Return session data (keep the cookie for future requests)
    return NextResponse.json(sessionData);
  } catch (error) {
    console.error("Failed to get session:", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}
