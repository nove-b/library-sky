import { expect, test } from "@playwright/test";
import {
  mockKnownSessionRefresh,
  mockSeededSearch,
  restoreKnownSession,
  SEEDED_BOOKS,
  SEEDED_DRAFT,
} from "./fixtures";

test.use({ storageState: "./e2e/.auth/session.json" });

test.describe("読書ログアプリ smoke", () => {
  test.beforeEach(async ({ page }) => {
    await mockKnownSessionRefresh(page);
  });

  test("投稿には本の選択が必要", async ({ page }) => {
    await mockSeededSearch(page);
    await page.goto("/");

    const submitButton = page.getByTestId("post-submit");
    await expect(submitButton).toBeDisabled();

    await page.getByTestId("book-search-input").fill("吾輩は猫である");
    await page.getByRole("button", { name: "検索" }).click();
    await page.getByTestId(`search-result-${SEEDED_BOOKS[0].asin}`).click();

    await expect(submitButton).toBeEnabled();
  });

  test("ログアウト後に再ログインすると下書きが復元される", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("comment-input").fill(SEEDED_DRAFT.comment);

    await page.getByTestId("logout-button").click();
    await expect(page.getByTestId("oauth-login-button")).toBeVisible();

    await restoreKnownSession(page);
    await page.reload();

    await expect(page.getByTestId("comment-input")).toHaveValue(SEEDED_DRAFT.comment);
  });

  test("検索はseed済みfixtureセットを返す", async ({ page }) => {
    await mockSeededSearch(page);
    await page.goto("/");

    await page.getByTestId("book-search-input").fill("夏目漱石");
    await page.getByRole("button", { name: "検索" }).click();

    await expect(page.getByTestId(`search-result-${SEEDED_BOOKS[1].asin}`)).toContainText(
      SEEDED_BOOKS[1].title,
    );
  });
});
