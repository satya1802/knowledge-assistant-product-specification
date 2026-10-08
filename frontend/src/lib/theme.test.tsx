import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { THEME_STORAGE_KEY, ThemeProvider, useTheme } from "@/lib/theme";

function Probe() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <p data-testid="theme">{theme}</p>
      <p data-testid="resolved">{resolvedTheme}</p>
      <button onClick={() => setTheme("light")}>light</button>
      <button onClick={() => setTheme("dark")}>dark</button>
      <button onClick={() => setTheme("system")}>system</button>
    </div>
  );
}

/** Minimal mock so the suite can flip `matches` and fire a `change` event,
 * the same shape MediaQueryList exposes. */
function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners: Array<(e: { matches: boolean }) => void> = [];
  const mql = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
      listeners.push(cb);
    },
    removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    },
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => mql),
  );
  return {
    fire(next: boolean) {
      matches = next;
      act(() => listeners.forEach((cb) => cb({ matches: next })));
    },
  };
}

describe("theme store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to system and resolves against prefers-color-scheme", async () => {
    installMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("theme")).toHaveTextContent("system"));
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
  });

  it("persists an explicit choice under one localStorage key and applies it immediately", async () => {
    installMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "dark" }));

    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("reads a previously persisted choice back on mount (survives a restart)", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    installMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("theme")).toHaveTextContent("light"));
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
  });

  it("AC-081: with System selected, a live OS change updates resolvedTheme with no reload", async () => {
    const mq = installMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "system" }));
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");

    mq.fire(true);

    await waitFor(() => expect(screen.getByTestId("resolved")).toHaveTextContent("dark"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("useTheme throws outside a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Bare() {
      useTheme();
      return null;
    }
    expect(() => render(<Bare />)).toThrow();
    spy.mockRestore();
  });
});
