import type { Page } from "@playwright/test";

export const KNOWN_SESSION = {
  handle: "testuser.bsky.social",
  displayName: "Test User",
  avatarUrl: "",
  did: "did:plc:testdid123",
  accessJwt: "oauth:did:plc:testdid123",
  refreshJwt: "oauth:did:plc:testdid123",
  service: "https://bsky.social",
};

export const SEEDED_BOOKS = [
  {
    title: "吾輩は猫である",
    author: "夏目漱石",
    imageUrl: "",
    asin: "asin-001",
    affiliateUrl: "https://example.com/affiliate/001",
    publisher: "新潮社",
    price: "770",
  },
  {
    title: "こころ",
    author: "夏目漱石",
    imageUrl: "",
    asin: "asin-002",
    affiliateUrl: "https://example.com/affiliate/002",
    publisher: "新潮社",
    price: "660",
  },
] as const;

export const SEEDED_DRAFT = {
  title: "吾輩は猫である",
  author: "夏目漱石",
  comment: "面白い名作です",
  hashtags: ["読書", "日本文学"],
  status: "completed",
  rating: 5,
  imageUrl: "",
  affiliateUrl: "",
} as const;

export async function mockSeededSearch(page: Page) {
  await page.route("/api/books/serch*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        count: SEEDED_BOOKS.length,
        items: SEEDED_BOOKS,
        currentPage: 1,
        hasMore: false,
        isFuzzy: false,
      }),
    });
  });
}

export async function mockKnownSessionRefresh(page: Page) {
  await page.route("/api/bluesky/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(KNOWN_SESSION),
    });
  });
}

export async function restoreKnownSession(page: Page) {
  await page.evaluate((session) => {
    localStorage.setItem("library-sky-session", JSON.stringify(session));
    window.dispatchEvent(new Event("library-sky-session-change"));
  }, KNOWN_SESSION);
}