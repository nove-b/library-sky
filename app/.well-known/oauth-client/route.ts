import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://127.0.0.1:3000";
  const redirectUri = `${baseUrl}/api/bluesky/oauth/callback`;

  const metadata = {
    client_id: baseUrl,
    client_name: "Library Sky",
    client_uri: baseUrl,
    redirect_uris: [redirectUri],
    scope: "atproto",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    application_type: "web",
  };

  return NextResponse.json(metadata, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
