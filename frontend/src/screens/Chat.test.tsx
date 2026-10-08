import { render, screen, waitFor, within } from "@testing-library/react";
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
      fetchMock.mock.calls.some((call) => String(call[0]).includes("/api/conversations/c-server-2")),
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
});
