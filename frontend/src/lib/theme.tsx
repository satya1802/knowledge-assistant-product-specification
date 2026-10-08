/**
 * Single source of truth for the app's Light/Dark/System theme.
 *
 * Persists the user's raw choice ("light" | "dark" | "system") to
 * localStorage under one key, resolves "system" against
 * `prefers-color-scheme` (with a live listener while that choice is
 * active), and mirrors the resolved value onto `<html data-theme>` /
 * `.dark` so CSS driven off those hooks (see index.css) stays in sync with
 * whatever a screen renders from `useTheme()`.
 *
 * A tiny inline script in index.html performs the same read + attribute
 * set before React mounts, so first paint (including /sign-in) never
 * flashes the wrong theme.
 */
import * as React from "react";

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "ka-theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredChoice(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // localStorage unavailable (e.g. privacy mode) -- fall through to default.
  }
  return "system";
}

function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

interface ThemeContextValue {
  /** The user's raw, persisted choice. */
  theme: ThemeChoice;
  /** "system" resolved against the OS; otherwise equal to `theme`. */
  resolvedTheme: ResolvedTheme;
  setTheme: (value: ThemeChoice) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeChoice>(() => readStoredChoice());
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() => getSystemTheme());

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme;

  React.useEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Only listens while "system" is the active choice -- per the constraint,
  // not an always-on listener.
  React.useEffect(() => {
    if (theme !== "system" || typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) =>
      setSystemTheme(event.matches ? "dark" : "light");
    setSystemTheme(mq.matches ? "dark" : "light");
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else if (mq.addListener) mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else if (mq.removeListener) mq.removeListener(handler);
    };
  }, [theme]);

  const setTheme = React.useCallback((value: ThemeChoice) => {
    setThemeState(value);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, value);
      } catch {
        // localStorage unavailable -- the choice still applies for this session.
      }
    }
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
