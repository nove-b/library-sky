import {
  NodeOAuthClient,
  type NodeSavedState,
  type NodeSavedStateStore,
  type NodeSavedSession,
  type NodeSavedSessionStore,
} from "@atproto/oauth-client-node";
import { Agent } from "@atproto/api";

// Use globalThis to persist stores across Next.js hot reloads in dev mode
const globalStore = globalThis as unknown as {
  __oauthStateStore?: Map<string, NodeSavedState>;
  __oauthSessionStore?: Map<string, NodeSavedSession>;
  __oauthClient?: NodeOAuthClient;
};

function getStateMap(): Map<string, NodeSavedState> {
  if (!globalStore.__oauthStateStore) {
    globalStore.__oauthStateStore = new Map();
  }
  return globalStore.__oauthStateStore;
}

function getSessionMap(): Map<string, NodeSavedSession> {
  if (!globalStore.__oauthSessionStore) {
    globalStore.__oauthSessionStore = new Map();
  }
  return globalStore.__oauthSessionStore;
}

const stateStore: NodeSavedStateStore = {
  get: (key: string) => getStateMap().get(key),
  set: (key: string, val: NodeSavedState) => { getStateMap().set(key, val); },
  del: (key: string) => { getStateMap().delete(key); },
};

const sessionStore: NodeSavedSessionStore = {
  get: (key: string) => getSessionMap().get(key),
  set: (key: string, val: NodeSavedSession) => { getSessionMap().set(key, val); },
  del: (key: string) => { getSessionMap().delete(key); },
};

export function getOAuthStoredTokens(sub: string): {
  accessJwt: string;
  refreshJwt: string;
} | null {
  const session = getSessionMap().get(sub) as unknown as {
    tokenSet?: { access_token?: string; refresh_token?: string };
  } | undefined;

  if (!session?.tokenSet?.access_token) {
    return null;
  }

  return {
    accessJwt: session.tokenSet.access_token,
    refreshJwt: session.tokenSet.refresh_token ?? "",
  };
}

export async function createOAuthAgent(sub: string): Promise<Agent> {
  const oauthClient = getOAuthClient();
  const oauthSession = await oauthClient.restore(sub, "auto");
  return new Agent(oauthSession);
}

export function getOAuthClient(): NodeOAuthClient {
  if (globalStore.__oauthClient) return globalStore.__oauthClient;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://127.0.0.1:3000";
  const isLocalDev =
    baseUrl.includes("127.0.0.1") || baseUrl.includes("localhost");

  globalStore.__oauthClient = new NodeOAuthClient({
    clientMetadata: isLocalDev
      ? {
        client_id: `http://localhost?redirect_uri=${encodeURIComponent(`${baseUrl}/api/bluesky/oauth/callback`)}&scope=${encodeURIComponent("atproto transition:generic")}`,
        client_name: "Library Sky",
        client_uri: baseUrl,
        redirect_uris: [`${baseUrl}/api/bluesky/oauth/callback`],
        scope: "atproto transition:generic",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        application_type: "web",
        dpop_bound_access_tokens: true,
      }
      : {
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
      },
    stateStore,
    sessionStore,
  });

  return globalStore.__oauthClient;
}
