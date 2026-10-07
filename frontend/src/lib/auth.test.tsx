import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "@/lib/auth";

function mockFetchOnce(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    clone() {
      return this;
    },
  };
}

function Consumer() {
  const { user, loading, selfRegistrationEnabled, login, logout } = useAuth();
  if (loading) return <p>loading</p>;
  return (
    <div>
      <p>{user ? `signed in as ${user.name}` : "signed out"}</p>
      <p>{selfRegistrationEnabled ? "self-reg on" : "self-reg off"}</p>
      <button onClick={() => login("a@b.com", "secret1234567")}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderWithProvider(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <AuthProvider>
              <Consumer />
            </AuthProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls GET /api/auth/me on load and reflects an existing session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockFetchOnce(200, {
        user: { id: "u1", name: "Satya", email: "satya@x.com", is_admin: true, is_enabled: true },
        self_registration_enabled: true,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider();

    await waitFor(() => expect(screen.getByText("signed in as Satya")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/me"),
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("surfaces no user when there is no session", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockFetchOnce(200, { user: null, self_registration_enabled: false }));
    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider();

    await waitFor(() => expect(screen.getByText("signed out")).toBeInTheDocument());
    expect(screen.getByText("self-reg off")).toBeInTheDocument();
  });

  it("clears user state after logout", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockFetchOnce(200, {
          user: { id: "u1", name: "Satya", email: "s@x.com", is_admin: false, is_enabled: true },
          self_registration_enabled: true,
        }),
      )
      .mockResolvedValueOnce(mockFetchOnce(401, { detail: "Session expired." }));
    vi.stubGlobal("fetch", fetchMock);

    renderWithProvider();
    await waitFor(() => expect(screen.getByText("signed in as Satya")).toBeInTheDocument());

    await userEvent.click(screen.getByText("logout"));

    await waitFor(() => expect(screen.getByText("signed out")).toBeInTheDocument());
  });
});
