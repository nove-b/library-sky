import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json(
      { error: "url parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Validate URL to prevent SSRF attacks
    const url = new URL(imageUrl);
    const allowedHosts = [
      "books.google.com",
      "lh3.googleusercontent.com",
    ];

    const isAllowed = allowedHosts.some(
      (host) => url.hostname === host || url.hostname.endsWith("." + host)
    );

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Image URL host not allowed" },
        { status: 403 }
      );
    }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; library-sky/1.0)",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type");
    const buffer = await response.arrayBuffer();

    // Return with CORS headers and cache control
    const headers = new Headers({
      "Content-Type": contentType || "image/jpeg",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Cache-Control": `public, max-age=${CACHE_DURATION}`,
    });

    return new NextResponse(buffer, { headers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
