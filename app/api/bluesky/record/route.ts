import { NextRequest, NextResponse } from "next/server";
import { createAgent, DEFAULT_BSKY_SERVICE } from "@/lib/bluesky";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uri = searchParams.get("uri");

    if (!uri) {
      return NextResponse.json(
        { error: "uri parameter is required" },
        { status: 400 }
      );
    }

    // Parse URI to extract DID and rkey
    const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid URI format" },
        { status: 400 }
      );
    }

    const [, did, collection, rkey] = match;

    // Use the public appview for read-only endpoints
    const agent = createAgent(DEFAULT_BSKY_SERVICE);

    try {
      const recordResponse = await agent.com.atproto.repo.getRecord({
        repo: did,
        collection: collection,
        rkey: rkey,
      });

      return NextResponse.json({
        success: true,
        record: recordResponse.data.value,
      });
    } catch (error) {
      console.error("[GET /api/bluesky/record] Failed to fetch record:", error);
      // Return empty record on error to fall back to what we have
      return NextResponse.json({
        success: false,
        record: null,
      });
    }
  } catch (error) {
    console.error("[GET /api/bluesky/record] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch record" },
      { status: 500 }
    );
  }
}
