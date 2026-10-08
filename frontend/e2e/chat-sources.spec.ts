import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * All chat-source tests stub the network at the route boundary (no live
 * backend dependency): GET /api/auth/me always reports a signed-in user,
 * POST /api/chat always serves a canned SSE transcript, and the download
 * endpoint returns a small fake file body.
 */
const SIGNED_IN_USER = {
  id: "usr_01",
  name: "Satya Ganaraju",
  email: "satya.ganaraju@quorq.ai",
  is_admin: true,
  is_enabled: true,
};

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function stubAuth(page: Page): Promise<void> {
  await page.route("**/api/auth/me", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: SIGNED_IN_USER, self_registration_enabled: true }),
    }),
  );
}

async function stubChat(page: Page, frames: string[]): Promise<void> {
  await page.route("**/api/chat", (route: Route) => {
    if (route.request().method() !== "POST") return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: frames.join(""),
    });
  });
}

async function stubDownload(page: Page): Promise<void> {
  await page.route("**/api/documents/*/download", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/pdf",
      body: "%PDF-1.4 fake source document bytes",
    }),
  );
}

/** A long padded paragraph so the message list genuinely overflows and
 * scrolls in a standard viewport -- needed to prove AC-049's scroll-position
 * claim rather than trivially comparing two zeros. */
function longPreamble(): string {
  return Array.from(
    { length: 24 },
    (_, i) => `Paragraph ${i + 1} of background context about company policy and process.`,
  ).join("\n\n");
}

async function ask(page: Page, question: string): Promise<void> {
  await page.getByLabel("Your question").fill(question);
  await page.getByRole("button", { name: /^Send$/ }).click();
}

const TWO_SOURCE_FRAMES = [
  sseFrame("token", {
    text:
      longPreamble() +
      "\n\nRemote work is allowed up to three days a week [1]. Security incidents must be escalated immediately [2].",
  }),
  sseFrame("citations", {
    citations: [
      {
        chip_number: 1,
        document_id: "doc-1",
        excerpt: "Up to three days per week, by agreement with your manager.",
        document_filename: "Remote-Work-Policy.pdf",
        document_file_type: "PDF",
        document_size_bytes: 204800,
        document_uploaded_by: "Satya Ganaraju",
        document_uploaded_at: "2026-01-02",
      },
      {
        chip_number: 2,
        document_id: "doc-2",
        excerpt: "Escalate suspected incidents to security@acme.example immediately.",
        document_filename: "Security-Incident-Runbook.docx",
        document_file_type: "DOCX",
        document_size_bytes: 51200,
        document_uploaded_by: "Priya Shah",
        document_uploaded_at: "2026-02-10",
      },
    ],
  }),
  sseFrame("done", { conversation_id: "c-sources-1", is_general_knowledge: false }),
];

const MISSING_DOCUMENT_FRAMES = [
  sseFrame("token", { text: "The archived handbook covered this topic [1]." }),
  sseFrame("citations", {
    citations: [
      {
        chip_number: 1,
        document_id: "doc-deleted",
        excerpt: "This content came from a document that was later removed.",
        // No document_filename/file_type/etc. -- the document no longer exists.
      },
    ],
  }),
  sseFrame("done", { conversation_id: "c-sources-2", is_general_knowledge: false }),
];

test.describe("Chat source chips and detail panel", () => {
  test("AC-047: chips render after streaming, numbered consistently with inline [n] markers, naming their documents", async ({
    page,
  }) => {
    await stubAuth(page);
    await stubChat(page, TWO_SOURCE_FRAMES);

    await page.goto("/chat");
    await ask(page, "What is the remote work policy and incident escalation process?");

    // Streaming finished: the Send button is back (Stop disappears) and the
    // persisted answer is visible.
    await expect(page.getByRole("button", { name: /^Send$/ })).toBeVisible();
    await expect(page.getByText(/Remote work is allowed up to three days a week/)).toBeVisible();

    // Inline markers, numbered 1 and 2, accessible as "Open source N".
    await expect(page.getByRole("button", { name: "Open source 1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open source 2" })).toBeVisible();

    // Sources list chips carry the same numbers and name their documents.
    await expect(page.getByText("Sources", { exact: true })).toBeVisible();
    const chip1 = page.getByRole("button", { name: /Remote-Work-Policy\.pdf/ });
    const chip2 = page.getByRole("button", { name: /Security-Incident-Runbook\.docx/ });
    await expect(chip1).toBeVisible();
    await expect(chip2).toBeVisible();
    await expect(chip1).toContainText("1");
    await expect(chip2).toContainText("2");
  });

  test("AC-048: clicking a chip opens the panel with document details and triggers the download call", async ({
    page,
  }) => {
    await stubAuth(page);
    await stubChat(page, TWO_SOURCE_FRAMES);
    await stubDownload(page);

    await page.goto("/chat");
    await ask(page, "What is the remote work policy?");
    await expect(page.getByRole("button", { name: /Remote-Work-Policy\.pdf/ })).toBeVisible();

    await page.getByRole("button", { name: /Remote-Work-Policy\.pdf/ }).click();

    const panel = page.getByRole("complementary", { name: "Source details" });
    await expect(panel.getByRole("heading", { name: "Source 1" })).toBeVisible();
    await expect(panel.getByText("Remote-Work-Policy.pdf")).toBeVisible();
    await expect(panel.getByText("PDF")).toBeVisible();
    await expect(panel.getByText("2026-01-02")).toBeVisible();
    await expect(panel.getByText("Satya Ganaraju")).toBeVisible();
    await expect(
      panel.getByText(/Up to three days per week, by agreement with your manager\./),
    ).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await panel.getByRole("button", { name: "Download original" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("Remote-Work-Policy.pdf");
  });

  test("AC-049: closing the panel and switching chips preserves conversation state and scroll position", async ({
    page,
  }) => {
    await stubAuth(page);
    await stubChat(page, TWO_SOURCE_FRAMES);

    await page.goto("/chat");
    await ask(page, "What is the remote work policy and incident escalation process?");
    await expect(page.getByRole("button", { name: /Security-Incident-Runbook\.docx/ })).toBeVisible();

    const messageList = page.locator("main div.overflow-y-auto").first();
    await messageList.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const scrollBefore = await messageList.evaluate((el) => el.scrollTop);
    expect(scrollBefore).toBeGreaterThan(0);

    // Open chip 1, close it: the answer text and scroll position survive.
    await page.getByRole("button", { name: /Remote-Work-Policy\.pdf/ }).click();
    const panel = page.getByRole("complementary", { name: "Source details" });
    await expect(panel.getByRole("heading", { name: "Source 1" })).toBeVisible();
    await panel.getByRole("button", { name: "Close source panel" }).click();
    await expect(panel).toBeHidden();

    await expect(page.getByText(/Remote work is allowed up to three days a week/)).toBeVisible();
    const scrollAfterClose = await messageList.evaluate((el) => el.scrollTop);
    expect(Math.abs(scrollAfterClose - scrollBefore)).toBeLessThanOrEqual(1);

    // Switching chips without closing updates the panel in place.
    await page.getByRole("button", { name: /Remote-Work-Policy\.pdf/ }).click();
    await expect(panel.getByRole("heading", { name: "Source 1" })).toBeVisible();
    await page.getByRole("button", { name: /Security-Incident-Runbook\.docx/ }).click();
    await expect(panel.getByRole("heading", { name: "Source 2" })).toBeVisible();
    await expect(panel.getByText("Security-Incident-Runbook.docx")).toBeVisible();

    const scrollAfterSwitch = await messageList.evaluate((el) => el.scrollTop);
    expect(Math.abs(scrollAfterSwitch - scrollBefore)).toBeLessThanOrEqual(1);
  });

  test("AC-050: a citation whose document is gone renders the 'no longer available' state with no download error", async ({
    page,
  }) => {
    await stubAuth(page);
    await stubChat(page, MISSING_DOCUMENT_FRAMES);

    await page.goto("/chat");
    await ask(page, "What did the archived handbook say about this?");

    const chip = page.getByRole("button", { name: /Source document/ });
    await expect(chip).toBeVisible();
    await chip.click();

    const panel = page.getByRole("complementary", { name: "Source details" });
    await expect(panel.getByRole("heading", { name: "Source 1" })).toBeVisible();
    await expect(panel.getByText(/no longer available/)).toBeVisible();

    // No download affordance is offered for a missing document, so there is
    // nothing that can fail or surface a download error.
    await expect(panel.getByRole("button", { name: "Download original" })).toHaveCount(0);
    await expect(page.getByText("Could not download this document.")).toHaveCount(0);
  });
});
