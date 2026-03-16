import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, getOAuthStoredTokens } from "@/lib/oauth-client";
import { createAgent } from "@/lib/bluesky";
import { saveOAuthSession } from "@/lib/blobs-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://127.0.0.1:3000";
const APPVIEW_SERVICE =
  process.env.NEXT_PUBLIC_BSKY_APPVIEW_SERVICE || "https://public.api.bsky.app";

export async function GET(request: NextRequest) {
  try {
    const params = new URLSearchParams(request.nextUrl.search);

    // Handle OAuth errors from the provider
    const error = params.get("error");
    const errorDescription = params.get("error_description");
    if (error) {
      const errorMessage = `OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`;
      console.error(errorMessage);
      const redirectUrl = new URL("/", BASE_URL);
      redirectUrl.searchParams.set("oauth_error", errorMessage);
      return NextResponse.redirect(redirectUrl);
    }

    // Use the official OAuth client to handle the callback
    const oauthClient = getOAuthClient();
    const { session } = await oauthClient.callback(params);

    const did = session.did;

    // Get the OAuth tokens from the session store
    const tokens = getOAuthStoredTokens(did);
    if (!tokens) {
      throw new Error("Failed to retrieve OAuth tokens after callback");
    }

    // Fetch user profile details
    let handle: string = did;
    let displayName: string = did;
    let avatarUrl = "";
    let service = "https://bsky.social";

    try {
      const appviewAgent = createAgent(APPVIEW_SERVICE);
      const profile = await appviewAgent.getProfile({ actor: did });
      handle = profile.data.handle || did;
      displayName = profile.data.displayName || handle;
      avatarUrl = profile.data.avatar || "";
    } catch (profileError) {
      console.warn("Failed to fetch profile:", profileError);
    }

    // Try to get PDS endpoint from DID document
    try {
      const didDoc = await fetch(
        did.startsWith("did:plc:")
          ? `https://plc.directory/${did}`
          : `${did.replace("did:web:", "https://").replace(/:/g, "/")}/.well-known/did.json`
      );
      if (didDoc.ok) {
        const doc = await didDoc.json();
        const pdsService = doc.service?.find(
          (s: { id: string; type: string; serviceEndpoint: string }) =>
            s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer"
        );
        if (pdsService?.serviceEndpoint) {
          service = pdsService.serviceEndpoint;
        }
      }
    } catch {
      // Use default service
    }

    // Always redirect to BASE_URL (127.0.0.1), not request.url which may be localhost
    const response = NextResponse.redirect(new URL("/", BASE_URL));

    // Store session data in httpOnly cookie
    // Include actual OAuth tokens for client-side session restoration
    const sessionObject = {
      handle,
      did,
      displayName,
      avatarUrl,
      service,
      accessJwt: tokens.accessJwt,
      refreshJwt: tokens.refreshJwt,
    };

    response.cookies.set("bsky_session", JSON.stringify(sessionObject), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Save the full session to Netlify Blobs for persistence across cold starts
    await saveOAuthSession(did, {
      ...sessionObject,
      storedAt: Date.now(),
    });

    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const redirectUrl = new URL("/", BASE_URL);
    redirectUrl.searchParams.set("oauth_error", errorMessage);
    return NextResponse.redirect(redirectUrl);
  }
}
