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
  const session = await agent.resumeSession({
    accessJwt: "",
    refreshJwt: params.refreshJwt,
    handle,
    did,
  });

  return {
    handle: session.data.handle,
    did: session.data.did,
    accessJwt: session.data.accessJwt,
    refreshJwt: session.data.refreshJwt,
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
