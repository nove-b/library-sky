import { getDeployStore } from "@netlify/blobs";

const OAUTH_SESSION_PREFIX = "oauth-session-";

export interface OAuthSessionData {
  handle: string;
  did: string;
  displayName: string;
  avatarUrl: string;
  service: string;
  accessJwt: string;
  refreshJwt: string;
  storedAt: number;
}

/**
 * Save OAuth session to Netlify Blobs for persistence across cold starts
 */
export async function saveOAuthSession(
  did: string,
  sessionData: OAuthSessionData
): Promise<void> {
  try {
    const store = getDeployStore();
    const key = `${OAUTH_SESSION_PREFIX}${did}`;
    await store.set(key, JSON.stringify(sessionData));
  } catch (error) {
    console.error("Failed to save OAuth session to Blobs:", error);
    // Don't throw - session will still work via cookie, but won't survive cold starts
  }
}

/**
 * Restore OAuth session from Netlify Blobs
 */
export async function restoreOAuthSession(
  did: string
): Promise<OAuthSessionData | null> {
  try {
    const store = getDeployStore();
    const key = `${OAUTH_SESSION_PREFIX}${did}`;
    const data = await store.get(key);
    if (!data) return null;
    
    // Convert ArrayBuffer to string
    const dataStr = typeof data === "string" 
      ? data 
      : new TextDecoder().decode(data);
    return JSON.parse(dataStr) as OAuthSessionData;
  } catch (error) {
    console.error("Failed to restore OAuth session from Blobs:", error);
    return null;
  }
}

/**
 * Delete OAuth session from Netlify Blobs
 */
export async function deleteOAuthSession(did: string): Promise<void> {
  try {
    const store = getDeployStore();
    const key = `${OAUTH_SESSION_PREFIX}${did}`;
    await store.delete(key);
  } catch (error) {
    console.error("Failed to delete OAuth session from Blobs:", error);
  }
}
