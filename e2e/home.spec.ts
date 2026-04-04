import { test, expect, type Page } from "@playwright/test";

const MOCK_SESSION = {
  handle: "testuser.bsky.social",
  displayName: "Test User",
  avatarUrl: "",
  did: "did:plc:testdid123",
  accessJwt: "oauth:did:plc:testdid123",
  refreshJwt: "oauth:did:plc:testdid123",
  service: "https://bsky.social",
};

const MOCK_BOOKS = [
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
];

/** Mock /api/bluesky/me to return a valid session (simulates post-OAuth login). */
async function mockSessionViaApi(page: Page) {
  await page.route("/api/bluesky/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SESSION),
    });
  });
}

/**
 * Wait until the session is active by confirming the "login required" banner
 * is gone.  Works whether the session came from localStorage or from the API.
 */
async function waitForSession(page: Page) {
  await expect(
    page.getByText("読書ログを投稿するには", { exact: false }),
  ).not.toBeVisible({ timeout: 10_000 });
}

test.describe("読書ログアプリ e2e", () => {
  /**
   * 本を選択せずに投稿できないこと
   * The submit button must remain disabled until a book is selected.
   */
  test("本を選択せずに投稿できないこと", async ({ page }) => {
    await mockSessionViaApi(page);
    await page.goto("/");
    await waitForSession(page);

    const submitButton = page.locator('button[type="submit"]');

    // Button is disabled when no book has been selected.
    await expect(submitButton).toBeDisabled();

    // Typing a title into the search field does NOT enable the button;
    // the user must explicitly search and select a book.
    await page.locator('input[placeholder="タイトルを入力"]').fill("夏目漱石");
    await expect(submitButton).toBeDisabled();
  });

  /**
   * ログアウトし再ログインしたときに記入した内容が復元できること
   * A draft saved before logout must be restored when the user logs back in.
   */
  test("ログアウトし再ログインしたときに記入した内容が復元できること", async ({
    page,
  }) => {
    const MOCK_DRAFT = {
      title: "吾輩は猫である",
      author: "夏目漱石",
      comment: "面白い名作です",
      hashtags: ["読書", "日本文学"],
      status: "completed",
      rating: 5,
      imageUrl: "",
      affiliateUrl: "",
    };

    // Simulate a draft that was saved before the user logged out.
    await page.addInitScript((draft) => {
      localStorage.setItem("library-sky-draft", JSON.stringify(draft));
    }, MOCK_DRAFT);

    // Simulate re-login: the session is restored via the /api/bluesky/me
    // endpoint (same path as a real OAuth callback redirect).
    await mockSessionViaApi(page);
    await page.goto("/");
    await waitForSession(page);

    // Comment text must be restored from the draft.
    await expect(
      page.locator('textarea[placeholder="感想をひとこと"]'),
    ).toHaveValue(MOCK_DRAFT.comment);

    // Each hashtag must appear as a removable chip.
    for (const tag of MOCK_DRAFT.hashtags) {
      await expect(
        page.locator(`[aria-label="#${tag} を削除"]`),
      ).toBeVisible();
    }
  });

  /**
   * 検索が機能すること
   * Entering a title and clicking "検索" must display the returned books.
   */
  test("検索が機能すること", async ({ page }) => {
    await mockSessionViaApi(page);

    await page.route("/api/books/serch*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          count: MOCK_BOOKS.length,
          items: MOCK_BOOKS,
          currentPage: 1,
          hasMore: false,
          isFuzzy: false,
        }),
      });
    });

    await page.goto("/");
    await waitForSession(page);

    await page.locator('input[placeholder="タイトルを入力"]').fill("夏目漱石");
    await page.getByRole("button", { name: "検索" }).click();

    // Both books returned by the mock API must be visible in the results.
    await expect(page.getByText("吾輩は猫である").first()).toBeVisible();
    await expect(page.getByText("こころ").first()).toBeVisible();
  });

  /**
   * 投稿がうまくいくこと
   * Searching, selecting a book and submitting the form must show the success
   * message.
   */
  test("投稿がうまくいくこと", async ({ page }) => {
    await mockSessionViaApi(page);

    await page.route("/api/books/serch*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          count: 1,
          items: [MOCK_BOOKS[0]],
          currentPage: 1,
          hasMore: false,
          isFuzzy: false,
        }),
      });
    });

    await page.route("/api/bluesky/log", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          recordUri:
            "at://did:plc:testdid123/com.library-sky.bookLog/testid123",
          postUri:
            "at://did:plc:testdid123/app.bsky.feed.post/testid123",
        }),
      });
    });

    await page.goto("/");
    await waitForSession(page);

    // Search for a book.
    await page
      .locator('input[placeholder="タイトルを入力"]')
      .fill("吾輩は猫である");
    await page.getByRole("button", { name: "検索" }).click();

    // Select the first result.
    await expect(page.getByText("吾輩は猫である").first()).toBeVisible();
    await page.getByRole("button", { name: "選択" }).first().click();

    // The "selected book" panel must appear.
    await expect(page.getByText("選択中の本")).toBeVisible();

    // The submit button must now be enabled.
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();

    // Submit the form.
    await submitButton.click();

    // A success notice must appear.
    await expect(page.getByText("Blueskyに投稿しました。")).toBeVisible();
  });
});
