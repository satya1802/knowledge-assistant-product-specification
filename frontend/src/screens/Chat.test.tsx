import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "@/App";

const SIGNED_IN_USER = {
  id: "usr_01",
  name: "Satya Ganaraju",
  email: "satya.ganaraju@quorq.ai",
  is_admin: true,
  is_enabled: true,
};

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    clone() {
      return this;
    },
  };
}

/** Builds a Response-like object whose `.body` is a real ReadableStream
 * emitting the given raw SSE frames, one chunk per frame -- mirroring how
 * the fetch response body is actually consumed by `streamChat`. */
function sseResponse(frames: string[]) {
  const encoder = new TextEncoder();
  let i = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (i < frames.length) {
        controller.enqueue(encoder.encode(frames[i]));
        i += 1;
      } else {
        controller.close();
      }
    },
  });
  return { ok: true, status: 200, body };
}

function frame(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function stubFetch(chatFrames: () => string[], handlers: Record<string, unknown> = {}) {
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.includes("/api/auth/me")) {
      return Promise.resolve(
        jsonResponse(200, { user: SIGNED_IN_USER, self_registration_enabled: true }),
      );
    }
    if (url.includes("/api/chat") && init?.method === "POST") {
      return Promise.resolve(sseResponse(chatFrames()));
    }
    const key = Object.keys(handlers).find((k) => url.includes(k));
    if (key) {
      const h = handlers[key] as { status: number; body: unknown };
      return Promise.resolve(jsonResponse(h.status, h.body));
    }
    return Promise.resolve(jsonResponse(404, { detail: "not found" }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function renderChat(chatFrames: () => string[], handlers: Record<string, unknown> = {}) {
  const fetchMock = stubFetch(chatFrames, handlers);
  render(
    <MemoryRouter initialEntries={["/chat"]}>
      <App />
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.getByText(/Hello, Satya/)).toBeInTheDocument());
  return fetchMock;
}

describe("Chat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("AC-038: appends the question immediately and streams assistant tokens from the SSE response", async () => {
    await renderChat(() => [
      frame("token", { text: "Remote work is " }),
      frame("token", { text: "allowed up to three days a week." }),
      frame("citations", {
        citations: [
          {
            chip_number: 1,
            document_id: "d1",
            excerpt: "Up to three days per week.",
            document_filename: "Remote-Work-Policy.pdf",
          },
        ],
      }),
      frame("done", { conversation_id: "c-server-1", is_general_knowledge: false }),
    ]);

    const textbox = screen.getByLabelText("Your question");
    await userEvent.type(textbox, "What is the remote work policy?");
    await userEvent.click(screen.getByRole("button", { name: /^Send$/ }));

    expect(screen.getAllByText("What is the remote work policy?").length).toBeGreaterThan(0);

    await waitFor(() =>
      expect(
        screen.getByText(/Remote work is allowed up to three days a week\./),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /Remote-Work-Policy\.pdf/ })).toBeInTheDocument();
  });

  it("AC-040: an error event shows a plain-language message with Retry and keeps the partial answer", async () => {
    await renderChat(() => [
      frame("token", { text: "Here is what I found so far: " }),
      frame("error", { detail: "The model was overloaded. Please try again." }),
    ]);

    await userEvent.type(screen.getByLabelText("Your question"), "Tell me about expenses");
    await userEvent.click(screen.getByRole("button", { name: /^Send$/ }));

    await waitFor(() =>
      expect(screen.getByText("The model was overloaded. Please try again.")).toBeInTheDocument(),
    );
    expect(screen.getByText(/Here is what I found so far:/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("AC-041: reopening a conversation fetches GET /api/conversations/{id} and renders the persisted answer", async () => {
    const fetchMock = await renderChat(
      () => [
        frame("token", { text: "Draft answer." }),
        frame("done", { conversation_id: "c-server-2", is_general_knowledge: false }),
      ],
      {
        "/api/conversations/c-server-2": {
          status: 200,
          body: {
            id: "c-server-2",
            title: "What is the remote work policy?",
            updated_at: new Date().toISOString(),
            messages: [
              {
                id: "srv-m1",
                role: "user",
                content: "What is the remote work policy?",
                created_at: new Date().toISOString(),
              },
              {
                id: "srv-m2",
                role: "assistant",
                content: "Persisted final answer from the server.",
                citations: [],
                created_at: new Date().toISOString(),
              },
            ],
          },
        },
      },
    );

    await userEvent.type(screen.getByLabelText("Your question"), "What is the remote work policy?");
    await userEvent.click(screen.getByRole("button", { name: /^Send$/ }));

    await waitFor(() => expect(screen.getByText("Draft answer.")).toBeInTheDocument());

    const historyList = screen.getByRole("list", { name: "Today" });
    await userEvent.click(within(historyList).getByText("What is the remote work policy?"));

    await waitFor(() =>
      expect(screen.getByText("Persisted final answer from the server.")).toBeInTheDocument(),
    );
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes("/api/conversations/c-server-2"),
      ),
    ).toBe(true);
  });

  it("AC-042: the send control is disabled for empty or whitespace-only input and Enter submits nothing", async () => {
    await renderChat(() => []);

    const sendButton = screen.getByRole("button", { name: /^Send$/ });
    expect(sendButton).toBeDisabled();

    const textbox = screen.getByLabelText("Your question");
    await userEvent.type(textbox, "   ");
    expect(screen.getByRole("button", { name: /^Send$/ })).toBeDisabled();

    await userEvent.keyboard("{Enter}");
    expect(screen.queryByText(/Hello, Satya/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: /./ })).toBeInTheDocument();
  });

  it("AC-071: the account menu shows the signed-in user's real name and email, not a seeded constant", async () => {
    await renderChat(() => []);

    await userEvent.click(screen.getByRole("button", { name: /Account menu|Satya Ganaraju/ }));

    const menu = screen.getByRole("menu", { name: "Account" });
    expect(within(menu).getByText("Satya Ganaraju")).toBeInTheDocument();
    expect(within(menu).getByText("satya.ganaraju@quorq.ai")).toBeInTheDocument();
  });

  it("AC-074: Sign out calls POST /api/auth/logout rather than merely navigating", async () => {
    const fetchMock = await renderChat(() => [], {
      "/api/auth/logout": { status: 204, body: null },
    });

    await userEvent.click(screen.getByRole("button", { name: /Account menu|Satya Ganaraju/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          (call) => String(call[0]).includes("/api/auth/logout") && call[1]?.method === "POST",
        ),
      ).toBe(true),
    );
  });

  it("AC-072: the collapse control persists its state under its own localStorage key, restored next visit", async () => {
    window.localStorage.clear();
    await renderChat(() => []);

    await userEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(window.localStorage.getItem("ka-chat-sidebar-open")).toBe("false");
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();

    // Simulate a fresh visit in the same browser: unmount, then remount.
    cleanup();
    await renderChat(() => []);
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });

  it("AC-084: the delete-conversation dialog traps Tab focus and returns focus to the trigger on close", async () => {
    await renderChat(() => [
      frame("token", { text: "An answer." }),
      frame("done", { conversation_id: "c-server-del", is_general_knowledge: false }),
    ]);

    await userEvent.type(screen.getByLabelText("Your question"), "What is the remote work policy?");
    await userEvent.click(screen.getByRole("button", { name: /^Send$/ }));
    await waitFor(() => expect(screen.getByText("An answer.")).toBeInTheDocument());

    const deleteTrigger = screen.getByRole("button", { name: /Delete chat/ });
    await userEvent.click(deleteTrigger);

    const dialog = await screen.findByRole("dialog");
    const cancelBtn = within(dialog).getByRole("button", { name: "Cancel" });
    const confirmBtn = within(dialog).getByRole("button", { name: "Delete conversation" });
    await waitFor(() => expect(cancelBtn).toHaveFocus());

    // Shift+Tab from the first control wraps to the last.
    await userEvent.tab({ shift: true });
    expect(confirmBtn).toHaveFocus();

    // Tab from the last control wraps back to the first.
    await userEvent.tab();
    expect(cancelBtn).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(deleteTrigger).toHaveFocus());
  });

  it("AC-083: Stop replaces Send while streaming, and Space activates it from the keyboard", async () => {
    let unblock: (() => void) | null = null;
    const blocked = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    const encoder = new TextEncoder();
    const streamBody = new ReadableStream({
      async pull(controller) {
        controller.enqueue(encoder.encode(frame("token", { text: "Partial…" })));
        await blocked;
        controller.enqueue(
          encoder.encode(frame("done", { conversation_id: "c-stop-1", is_general_knowledge: false })),
        );
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/api/auth/me")) {
        return Promise.resolve(
          jsonResponse(200, { user: SIGNED_IN_USER, self_registration_enabled: true }),
        );
      }
      if (url.includes("/api/chat") && init?.method === "POST") {
        return Promise.resolve({ ok: true, status: 200, body: streamBody });
      }
      return Promise.resolve(jsonResponse(404, { detail: "not found" }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MemoryRouter initialEntries={["/chat"]}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Hello, Satya/)).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Your question"), "What is the remote work policy?");
    await userEvent.click(screen.getByRole("button", { name: /^Send$/ }));

    const stopBtn = await screen.findByRole("button", { name: "Stop" });
    stopBtn.focus();
    expect(stopBtn).toHaveFocus();
    await userEvent.keyboard(" ");

    await waitFor(() => expect(screen.getByText(/stopped/i)).toBeInTheDocument());
    await act(async () => {
      unblock?.();
      await Promise.resolve();
    });
  });

  it("AC-073: New chat shows the welcome screen and keeps the previous conversation in history", async () => {
    await renderChat(() => [
      frame("token", { text: "An answer." }),
      frame("done", { conversation_id: "c-server-3", is_general_knowledge: false }),
    ]);

    await userEvent.type(screen.getByLabelText("Your question"), "What is the remote work policy?");
    await userEvent.click(screen.getByRole("button", { name: /^Send$/ }));
    await waitFor(() => expect(screen.getByText("An answer.")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "New chat" }));

    await waitFor(() => expect(screen.getByText(/Hello, Satya/)).toBeInTheDocument());
    const historyList = screen.getByRole("list", { name: "Today" });
    expect(within(historyList).getByText("What is the remote work policy?")).toBeInTheDocument();
  });
});
