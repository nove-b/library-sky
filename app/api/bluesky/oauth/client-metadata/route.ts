import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth client metadata endpoint for production use.
 * Bluesky fetches this URL to verify the OAuth client.
 * In local dev, the special "http://localhost" client_id is used instead.
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://127.0.0.1:3000";

  const metadata = {
    client_id: `${baseUrl}/api/bluesky/oauth/client-metadata`,
    client_name: "Library Sky",
    client_uri: baseUrl,
    redirect_uris: [`${baseUrl}/api/bluesky/oauth/callback`],
    scope: "atproto transition:generic",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    application_type: "web",
    dpop_bound_access_tokens: true,
  };

  return NextResponse.json(metadata, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
