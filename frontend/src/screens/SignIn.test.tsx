import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "@/App";

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

function stubFetch(meBody: unknown, handlers: Record<string, unknown> = {}) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/api/auth/me")) {
      return Promise.resolve(jsonResponse(200, meBody));
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

describe("SignIn", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC-004: hides the create-account tab when self-registration is disabled", async () => {
    stubFetch({ user: null, self_registration_enabled: false });
    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByLabelText("Email address")).toBeInTheDocument());
    expect(screen.queryByRole("tab", { name: "Create account" })).not.toBeInTheDocument();
  });

  it("AC-004: shows the create-account tab when self-registration is enabled", async () => {
    stubFetch({ user: null, self_registration_enabled: true });
    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Create account" })).toBeInTheDocument(),
    );
  });

  it("AC-005/AC-006: an existing session goes straight to the app, no sign-in prompt", async () => {
    stubFetch({
      user: { id: "u1", name: "Satya", email: "s@x.com", is_admin: true, is_enabled: true },
      self_registration_enabled: true,
    });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument());
  });

  it("AC-005: sign-in posts to /api/auth/login with credentials included", async () => {
    const fetchMock = stubFetch(
      { user: null, self_registration_enabled: true },
      {
        "/api/auth/login": {
          status: 200,
          body: {
            user: { id: "u2", name: "Marcus Webb", email: "m@x.com", is_admin: false, is_enabled: true },
          },
        },
      },
    );
    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByLabelText("Email address")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Email address"), "marcus.webb@northwind.example");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/ }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/login"),
        expect.objectContaining({ credentials: "include", method: "POST" }),
      ),
    );
  });

  it("AC-007/AC-013: renders the server's message verbatim, with no invented wording", async () => {
    const serverMessage = "Email or password is incorrect.";
    stubFetch(
      { user: null, self_registration_enabled: true },
      { "/api/auth/login": { status: 401, body: { detail: serverMessage } } },
    );
    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByLabelText("Email address")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Email address"), "unknown@northwind.example");
    await userEvent.type(screen.getByLabelText("Password"), "whatever1234");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/ }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(serverMessage);
    expect(alert).not.toHaveTextContent(/attempt.*left/i);
    expect(alert).not.toHaveTextContent(/already exists/i);
  });

  it("AC-002: a duplicate email on register shows the server's message verbatim", async () => {
    const serverMessage = "Those details cannot be used to create an account.";
    stubFetch(
      { user: null, self_registration_enabled: true },
      { "/api/auth/register": { status: 400, body: { detail: serverMessage } } },
    );
    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Create account" })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("tab", { name: "Create account" }));

    await userEvent.type(screen.getByLabelText("Full name"), "Alex Moreau");
    await userEvent.type(screen.getByLabelText("Work email address"), "dana.okafor@northwind.co");
    await userEvent.type(screen.getByLabelText("Password"), "a-long-enough-password");
    await userEvent.click(screen.getByRole("button", { name: /Create account/ }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(serverMessage);
    expect(alert).not.toHaveTextContent(/already exists/i);
  });

  it("AC-001: register success lands the user on the welcome screen as the new user", async () => {
    stubFetch(
      { user: null, self_registration_enabled: true },
      {
        "/api/auth/register": {
          status: 201,
          body: {
            user: {
              id: "u9",
              name: "Alex Moreau",
              email: "alex.moreau@northwind.co",
              is_admin: false,
              is_enabled: true,
            },
          },
        },
      },
    );
    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Create account" })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("tab", { name: "Create account" }));

    await userEvent.type(screen.getByLabelText("Full name"), "Alex Moreau");
    await userEvent.type(screen.getByLabelText("Work email address"), "alex.moreau@northwind.co");
    await userEvent.type(screen.getByLabelText("Password"), "a-long-enough-password");
    await userEvent.click(screen.getByRole("button", { name: /Create account/ }));

    await waitFor(() => expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument());
  });
});
