import { expect, test, type Page, type Route } from "@playwright/test";

import { registerAndSignIn } from "./helpers";

/**
 * Deletion is exercised end-to-end against a real signed-in session
 * (via registerAndSignIn), but /api/chat and /api/conversations are stubbed
 * at the route boundary so the scenarios are deterministic: no dependency on
 * a live Gemini backend or on documents actually existing.
 */

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

interface StoredConversation {
  id: string;
  title: string;
  updated_at: string;
}

/** Minimal canned SSE transcript that ends by naming `conversationId` as the
 * server-assigned conversation id -- this becomes the real id the app uses
 * for subsequent DELETE calls. */
function answerFrames(conversationId: string, text = "Here is the answer."): string[] {
  return [
    sseFrame("token", { text }),
    sseFrame("done", { conversation_id: conversationId, is_general_knowledge: false }),
  ];
}

async function stubChat(page: Page, framesForQuestion: (question: string) => string[]) {
  await page.route("**/api/chat", async (route: Route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = route.request().postDataJSON() as { content: string };
    return route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: framesForQuestion(body.content).join(""),
    });
  });
}

/**
 * In-memory conversation store backing both the list endpoint and the
 * delete endpoint, so the test can assert deletion actually persists across
 * the history reload the app triggers after every stream ends.
 */
async function stubConversations(
  page: Page,
  store: StoredConversation[],
  options: { deleteStatus?: number; deleteBody?: unknown } = {},
) {
  await page.route("**/api/conversations**", async (route: Route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const idMatch = url.pathname.match(/\/api\/conversations\/([^/]+)$/);

    if (idMatch) {
      const id = idMatch[1];
      if (method === "DELETE") {
        if (options.deleteStatus && options.deleteStatus >= 300) {
          return route.fulfill({
            status: options.deleteStatus,
            contentType: "application/json",
            body: JSON.stringify(options.deleteBody ?? { detail: "Delete failed." }),
          });
        }
        const idx = store.findIndex((c) => c.id === id);
        if (idx >= 0) store.splice(idx, 1);
        return route.fulfill({ status: 204, body: "" });
      }
      // GET /api/conversations/{id} -- used when reopening a conversation.
      const conv = store.find((c) => c.id === id);
      if (!conv) {
        return route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Conversation not found." }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...conv, messages: [] }),
      });
    }

    // GET /api/conversations -- the sidebar history list.
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(store),
    });
  });
}

async function ask(page: Page, question: string): Promise<void> {
  await page.getByLabel("Your question").fill(question);
  await page.getByRole("button", { name: /^Send$/ }).click();
}

const NOW = new Date().toISOString();

test.describe("Chat — deleting a conversation", () => {
  test("AC-068: confirming Delete issues DELETE, removes the conversation from the list, and it cannot be reopened", async ({
    page,
  }) => {
    await registerAndSignIn(page);

    const store: StoredConversation[] = [];
    await stubChat(page, () => answerFrames("c-del-068"));
    await stubConversations(page, store);

    await page.goto("/chat");
    await ask(page, "What is the remote work policy?");
    await expect(page.getByText("Here is the answer.")).toBeVisible();

    // Seed the store as the server would have, then start a second chat so
    // the first conversation is no longer the active one and its sidebar
    // trash trigger is reachable.
    store.push({ id: "c-del-068", title: "What is the remote work policy?", updated_at: NOW });
    await page.getByRole("button", { name: "New chat" }).click();

    const historyList = page.getByRole("list", { name: "Today" });
    await expect(
      historyList.getByRole("button", { name: "What is the remote work policy?", exact: true }),
    ).toBeVisible();

    const deleteTrigger = page.getByRole("button", {
      name: "Delete conversation What is the remote work policy?",
    });
    await deleteTrigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const deleteRequest = page.waitForRequest(
      (req) => req.url().includes("/api/conversations/c-del-068") && req.method() === "DELETE",
    );
    await dialog.getByRole("button", { name: "Delete conversation" }).click();
    await deleteRequest;

    await expect(page.getByText("Conversation deleted")).toBeVisible();
    await expect(
      historyList.getByRole("button", { name: "What is the remote work policy?", exact: true }),
    ).toHaveCount(0);

    // It cannot be reopened: no trigger for it exists anywhere in the UI
    // (it is gone from the sidebar's "Today" group entirely), and the
    // server-side store used to answer every history fetch no longer has it.
    await expect(page.getByRole("button", { name: /What is the remote work policy\?/ })).toHaveCount(
      0,
    );
    expect(store.find((c) => c.id === "c-del-068")).toBeUndefined();
  });

  test("AC-069: deleting the currently open conversation returns the main pane to the welcome screen", async ({
    page,
  }) => {
    await registerAndSignIn(page);

    const store: StoredConversation[] = [];
    await stubChat(page, () => answerFrames("c-del-069"));
    await stubConversations(page, store);

    await page.goto("/chat");
    await ask(page, "How much can I expense for a client dinner?");
    await expect(page.getByText("Here is the answer.")).toBeVisible();
    store.push({
      id: "c-del-069",
      title: "How much can I expense for a client dinner?",
      updated_at: NOW,
    });

    await page.getByRole("button", { name: /^Delete chat$/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Delete conversation" }).click();

    await expect(page.getByText("Conversation deleted")).toBeVisible();
    await expect(page.getByRole("heading", { name: /How can I help you today\?/ })).toBeVisible();
    await expect(page.getByLabel("Your question")).toBeFocused();
  });

  test("AC-070: cancelling the confirmation makes no DELETE request, keeps the conversation, and restores focus", async ({
    page,
  }) => {
    await registerAndSignIn(page);

    const store: StoredConversation[] = [];
    await stubChat(page, () => answerFrames("c-del-070"));
    await stubConversations(page, store);

    let deleteCalled = false;
    page.on("request", (req) => {
      if (req.method() === "DELETE" && req.url().includes("/api/conversations/c-del-070")) {
        deleteCalled = true;
      }
    });

    await page.goto("/chat");
    await ask(page, "Who do I escalate a security incident to?");
    await expect(page.getByText("Here is the answer.")).toBeVisible();
    store.push({
      id: "c-del-070",
      title: "Who do I escalate a security incident to?",
      updated_at: NOW,
    });

    const deleteTrigger = page.getByRole("button", { name: /^Delete chat$/ });
    await deleteTrigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();

    await expect(dialog).toBeHidden();
    expect(deleteCalled).toBe(false);
    await expect(
      page.getByRole("heading", { name: "Who do I escalate a security incident to?" }),
    ).toBeVisible();
    await expect(deleteTrigger).toBeFocused();
  });

  test("a failed DELETE surfaces the server's own message and keeps the conversation in the list", async ({
    page,
  }) => {
    await registerAndSignIn(page);

    const store: StoredConversation[] = [];
    const SERVER_MESSAGE = "You do not have permission to delete this conversation.";
    await stubChat(page, () => answerFrames("c-del-fail"));
    await stubConversations(page, store, {
      deleteStatus: 403,
      deleteBody: { detail: SERVER_MESSAGE },
    });

    await page.goto("/chat");
    await ask(page, "What should be ready for a new starter's first day?");
    await expect(page.getByText("Here is the answer.")).toBeVisible();
    store.push({
      id: "c-del-fail",
      title: "What should be ready for a new starter's first day?",
      updated_at: NOW,
    });

    await page.getByRole("button", { name: /^Delete chat$/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Delete conversation" }).click();

    await expect(page.getByText(SERVER_MESSAGE)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What should be ready for a new starter's first day?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "New chat" }).click();
    const historyList = page.getByRole("list", { name: "Today" });
    await expect(
      historyList.getByRole("button", {
        name: "What should be ready for a new starter's first day?",
        exact: true,
      }),
    ).toBeVisible();
  });
});
