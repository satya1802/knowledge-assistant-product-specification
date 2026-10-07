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

const SIGNED_IN_USER = {
  id: "usr_01HQ8",
  name: "Satya Ganaraju",
  email: "satya.ganaraju@quorq.ai",
  is_admin: true,
  is_enabled: true,
};

function stubFetch(handlers: Record<string, unknown> = {}) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/api/auth/me")) {
      return Promise.resolve(
        jsonResponse(200, { user: SIGNED_IN_USER, self_registration_enabled: true }),
      );
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

async function renderAccount(handlers: Record<string, unknown> = {}) {
  const fetchMock = stubFetch(handlers);
  render(
    <MemoryRouter initialEntries={["/account"]}>
      <App />
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.getByText("Satya Ganaraju")).toBeInTheDocument());
  return fetchMock;
}

describe("Account", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the signed-in user's profile from GET /api/auth/me, no fake activity section", async () => {
    await renderAccount();
    expect(screen.getByText("satya.ganaraju@quorq.ai")).toBeInTheDocument();
    expect(screen.getByText("Administrator")).toBeInTheDocument();
    expect(screen.queryByText("Recent sign-in activity")).not.toBeInTheDocument();
  });

  it("AC-014: submitting posts to /api/auth/change-password and renders the server's confirmation", async () => {
    const serverMessage = "Password changed.";
    await renderAccount({
      "/api/auth/change-password": { status: 200, body: { detail: serverMessage } },
    });

    await userEvent.type(screen.getByLabelText("Current password"), "old-password-123");
    await userEvent.type(screen.getByLabelText("New password"), "new-password-456789");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "new-password-456789");
    await userEvent.click(screen.getByRole("button", { name: /Update password/ }));

    await waitFor(() => expect(screen.getByText(serverMessage)).toBeInTheDocument());
  });

  it("AC-015: a wrong current password renders the server's field-scoped error inline, form not cleared", async () => {
    const serverMessage = "Current password is incorrect.";
    await renderAccount({
      "/api/auth/change-password": {
        status: 400,
        body: { field: "current_password", detail: serverMessage },
      },
    });

    await userEvent.type(screen.getByLabelText("Current password"), "wrong-password");
    await userEvent.type(screen.getByLabelText("New password"), "new-password-456789");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "new-password-456789");
    await userEvent.click(screen.getByRole("button", { name: /Update password/ }));

    await waitFor(() => expect(screen.getByText(serverMessage)).toBeInTheDocument());
    expect(screen.getByLabelText("Current password")).toHaveValue("wrong-password");
    expect(screen.queryByText(/Password changed/i)).not.toBeInTheDocument();
  });

  it("AC-015: a mismatch error on confirm_password is shown against that field", async () => {
    const serverMessage = "The two passwords do not match.";
    await renderAccount({
      "/api/auth/change-password": {
        status: 400,
        body: { field: "confirm_password", detail: serverMessage },
      },
    });

    await userEvent.type(screen.getByLabelText("Current password"), "old-password-123");
    await userEvent.type(screen.getByLabelText("New password"), "new-password-456789");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "new-password-456789");
    await userEvent.click(screen.getByRole("button", { name: /Update password/ }));

    await waitFor(() => expect(screen.getByText(serverMessage)).toBeInTheDocument());
    expect(screen.getByLabelText("Confirm new password")).toHaveValue("new-password-456789");
  });

  it("sign out calls POST /api/auth/logout and returns to /sign-in", async () => {
    const fetchMock = await renderAccount({
      "/api/auth/logout": { status: 204, body: undefined },
    });

    await userEvent.click(screen.getByRole("button", { name: /Sign out/ }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/logout"),
        expect.objectContaining({ credentials: "include", method: "POST" }),
      ),
    );
    await waitFor(() => expect(screen.getByLabelText("Email address")).toBeInTheDocument());
  });

  it("the minimum-length rule matches the server's MIN_PASSWORD_LENGTH (12)", async () => {
    await renderAccount();
    expect(screen.getByText("At least 12 characters")).toBeInTheDocument();
  });
});
