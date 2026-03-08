import { BskyAgent, RichText } from "@atproto/api";
import crypto from "crypto";

export const DEFAULT_BSKY_SERVICE = "https://bsky.social";

type SessionStore = Map<string, BskyAgent>;

function getStore(): SessionStore {
  const globalStore = globalThis as { __bskySessions?: SessionStore };
  if (!globalStore.__bskySessions) {
    globalStore.__bskySessions = new Map();
  }
  return globalStore.__bskySessions;
}

export function createAgent(service?: string) {
  return new BskyAgent({ service: service ?? DEFAULT_BSKY_SERVICE });
}

export async function loginToBluesky(params: {
  identifier: string;
  password: string;
  service?: string;
}) {
  const agent = createAgent(params.service);
  const session = await agent.login({
    identifier: params.identifier,
    password: params.password,
  });

  const sessionId = crypto.randomUUID();
  getStore().set(sessionId, agent);

  return {
    sessionId,
    profile: {
      handle: session.data.handle,
      did: session.data.did,
      accessJwt: session.data.accessJwt,
      refreshJwt: session.data.refreshJwt,
    },
    service: params.service ?? DEFAULT_BSKY_SERVICE,
  };
}

export async function refreshSession(params: {
  refreshJwt: string;
  service?: string;
}) {
  let did = "";
  let handle = "";

  try {
    const jwtParts = params.refreshJwt.split(".");
    if (jwtParts.length === 3) {
      const decodedPayload = Buffer.from(jwtParts[1], "base64").toString(
        "utf-8"
      );
      const payload = JSON.parse(decodedPayload) as {
        sub?: string;
        handle?: string;
      };
      did = payload.sub ?? "";
      handle = payload.handle ?? "";
    }
  } catch {
    // Continue without extracting from JWT
  }

  const agent = createAgent(params.service);
  await agent.resumeSession({
    accessJwt: "",
    refreshJwt: params.refreshJwt,
    handle,
    did,
    active: true,
  });

  if (!agent.session) {
    throw new Error("Failed to resume session");
  }

  return {
    handle: agent.session.handle,
    did: agent.session.did,
    accessJwt: agent.session.accessJwt,
    refreshJwt: agent.session.refreshJwt,
  };
}

export function getAgent(sessionId: string) {
  const agent = getStore().get(sessionId);
  if (!agent) {
    throw new Error("Session not found");
  }
  return agent;
}

export function logoutSession(sessionId: string) {
  getStore().delete(sessionId);
}

export async function buildFacets(agent: BskyAgent, text: string) {
  const richText = new RichText({ text });
  await richText.detectFacets(agent);
  return richText.facets;
}

// OAuth-related functions
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateOAuthCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateOAuthCodeChallenge(verifier: string): string {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
}

export function getOAuthAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  service?: string;
}): string {
  const service = params.service ?? DEFAULT_BSKY_SERVICE;
  const url = new URL(service);
  url.pathname = "/oauth/authorize";

  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "atproto");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

export async function exchangeOAuthCode(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
  service?: string;
}) {
  const service = params.service ?? DEFAULT_BSKY_SERVICE;
  const url = new URL(service);
  url.pathname = "/oauth/token";

  const requestBody: Record<string, unknown> = {
    grant_type: "authorization_code",
    code: params.code,
    code_verifier: params.codeVerifier,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`OAuth token exchange failed: ${errorText}`);
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };

  return {
    accessJwt: data.access_token,
    refreshJwt: data.refresh_token,
  };
}

export async function resumeOAuthSession(params: {
  accessJwt: string;
  refreshJwt: string;
  service?: string;
}) {
  const agent = createAgent(params.service);

  // Create a session with OAuth tokens
  const session = {
    accessJwt: params.accessJwt,
    refreshJwt: params.refreshJwt,
    did: "", // Will be populated by resumeSession
    handle: "", // Will be populated by resumeSession
    active: true,
  };

  await agent.resumeSession(session);

  if (!agent.session) {
    throw new Error("Failed to resume OAuth session");
  }

  return {
    handle: agent.session.handle,
    did: agent.session.did,
    accessJwt: agent.session.accessJwt,
    refreshJwt: agent.session.refreshJwt,
  };
}
