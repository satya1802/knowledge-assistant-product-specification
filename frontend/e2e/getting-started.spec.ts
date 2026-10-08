import { expect, test } from "@playwright/test";

import { registerAndSignIn } from "./helpers";

test.describe("Getting started — reachable while signed in (AC-086)", () => {
  test("sidebar link opens the guide and it covers the required topics", async ({ page }) => {
    await registerAndSignIn(page);

    await page.getByRole("link", { name: "Getting started" }).click();
    await expect(page).toHaveURL(/\/getting-started$/);

    await expect(
      page.getByRole("heading", { name: "Ask your first question" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Read the source chips" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Add documents to the knowledge base" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "The library is shared and open" }),
    ).toBeVisible();
  });
});

test.describe("Getting started — mobile readability (AC-087)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("has no horizontal overflow at 375px and returns to chat in one click", async ({
    page,
  }) => {
    await registerAndSignIn(page);

    await page.goto("/getting-started");
    await expect(page.getByRole("heading", { name: "Getting started" })).toBeVisible();

    const { scrollWidth, viewportWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth);

    await page.getByRole("button", { name: "Back to chat" }).click();
    await expect(page).toHaveURL(/\/chat$/);
  });
});
