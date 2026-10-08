import { expect, test } from "@playwright/test";

/** Value-shaped credential formats — not the mere words "key"/"token"/etc,
 * which the page is allowed to use when explaining that no secret appears. */
const SECRET_VALUE_PATTERNS: RegExp[] = [
  /AIza[0-9A-Za-z\-_]{35}/, // Google/Gemini API key
  /sk-[A-Za-z0-9]{20,}/, // OpenAI-style secret key
  /ya29\.[0-9A-Za-z\-_]+/, // OAuth2 access token
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /Bearer\s+[A-Za-z0-9\-_.]{20,}/,
  // An actual assignment of a long opaque value to a credential-shaped field,
  // e.g. "api_key": "AbCdEf0123456789" — not just the field name on its own.
  /["'](?:api[_-]?key|secret|token|password|passwd|client[_-]?secret)["']\s*[:=]\s*["'][^"'\s]{8,}["']/i,
];

function assertNoSecrets(text: string, where: string) {
  for (const pattern of SECRET_VALUE_PATTERNS) {
    expect(pattern.test(text), `${where} matched secret-shaped pattern ${pattern}`).toBeFalsy();
  }
}

/** Finds the endpoint row by its exact path text and HTTP method badge
 * together, since some paths (e.g. /api/conversations/{id}) are reused by
 * more than one method. */
function endpointRow(page: import("@playwright/test").Page, method: string, path: string) {
  return page
    .locator("li")
    .filter({ has: page.getByText(path, { exact: true }) })
    .filter({ hasText: method });
}

const KEY_ENDPOINTS: Array<{ method: string; path: string; group: string }> = [
  { method: "POST", path: "/api/auth/login", group: "Authentication" },
  { method: "GET", path: "/api/auth/me", group: "Authentication" },
  { method: "GET", path: "/api/documents", group: "Documents" },
  { method: "DELETE", path: "/api/documents/{id}", group: "Documents" },
  { method: "POST", path: "/api/chat", group: "Chat" },
  { method: "POST", path: "/api/chat/{message_id}/regenerate", group: "Chat" },
  { method: "GET", path: "/api/conversations", group: "Conversations" },
  { method: "DELETE", path: "/api/conversations/{id}", group: "Conversations" },
];

test.describe("API reference — contract coverage (AC-088)", () => {
  test("lists each key endpoint with method, parameters and example request/response", async ({
    page,
  }) => {
    await page.goto("/api-reference");
    await page.getByRole("button", { name: "Expand all" }).click();

    for (const { method, path } of KEY_ENDPOINTS) {
      const row = endpointRow(page, method, path);
      await expect(row, `row for ${method} ${path}`).toHaveCount(1);
      await expect(row.getByText("Parameters", { exact: true })).toBeVisible();
      await expect(row.getByText("Example request", { exact: true })).toBeVisible();
      await expect(row.getByText("Example response", { exact: true })).toBeVisible();
    }
  });

  test("group filters narrow to each required contract area", async ({ page }) => {
    await page.goto("/api-reference");
    for (const group of ["Authentication", "Documents", "Chat", "Conversations"]) {
      await page.getByRole("button", { name: group, exact: true }).click();
      await expect(page.getByText(/Showing \d+ of \d+ endpoints/)).toBeVisible();
      const count = await page.locator("main ul.mt-6 > li").count();
      expect(count, `${group} group should list at least one endpoint`).toBeGreaterThan(0);
    }
  });
});

test.describe("API reference — no-credentials guarantee (AC-089)", () => {
  test("rendered page text contains no key, secret, token or credential values", async ({
    page,
  }) => {
    await page.goto("/api-reference");
    await page.getByRole("button", { name: "Expand all" }).click();

    const bodyText = await page.locator("body").innerText();
    assertNoSecrets(bodyText, "rendered /api-reference body text");

    // The page is explicit that nothing here carries real credentials.
    await expect(page.getByText("No credentials on this page")).toBeVisible();
  });

  test("bundled JS served to the browser contains no key, secret, token or credential values", async ({
    page,
  }) => {
    await page.goto("/api-reference");

    const scriptSrcs: string[] = await page.evaluate(() =>
      Array.from(document.querySelectorAll("script[src]"))
        .map((el) => (el as HTMLScriptElement).src)
        .filter(Boolean),
    );
    expect(scriptSrcs.length, "expected at least one bundled script tag").toBeGreaterThan(0);

    for (const src of scriptSrcs) {
      const res = await page.request.get(src);
      const body = await res.text();
      assertNoSecrets(body, `bundled script ${src}`);
    }
  });
});
