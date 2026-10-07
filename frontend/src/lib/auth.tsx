/**
 * Single source of truth for "who is signed in", consumed by App.tsx.
 *
 * Screens never call GET /api/auth/me themselves; they read `useAuth()`. A
 * 401 from any call anywhere clears this state and sends the browser to
 * /sign-in -- see the handler registered with `setUnauthorizedHandler`.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch, setUnauthorizedHandler } from "@/lib/api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  is_enabled: boolean;
}

interface MeResponse {
  user: AuthUser | null;
  self_registration_enabled: boolean;
}

interface LoginResponse {
  user: AuthUser;
}

interface RegisterResponse {
  user: AuthUser;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  selfRegistrationEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [selfRegistrationEnabled, setSelfRegistrationEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const clearAndRedirect = React.useCallback(() => {
    setUser(null);
    navigate("/sign-in");
  }, [navigate]);

  React.useEffect(() => {
    setUnauthorizedHandler(clearAndRedirect);
    return () => setUnauthorizedHandler(null);
  }, [clearAndRedirect]);

  React.useEffect(() => {
    let cancelled = false;
    apiFetch<MeResponse>("/api/auth/me")
      .then((res) => {
        if (cancelled) return;
        setUser(res.user);
        setSelfRegistrationEnabled(res.self_registration_enabled);
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const res = await apiFetch<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(res.user);
  }, []);

  const register = React.useCallback(async (name: string, email: string, password: string) => {
    const res = await apiFetch<RegisterResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setUser(res.user);
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await apiFetch<void>("/api/auth/logout", { method: "POST" });
    } catch {
      // Already signed out server-side, or the session was otherwise
      // invalid -- either way the client still clears its own state below.
    } finally {
      setUser(null);
      navigate("/sign-in");
    }
  }, [navigate]);

  const value = React.useMemo<AuthState>(
    () => ({ user, loading, selfRegistrationEnabled, login, register, logout }),
    [user, loading, selfRegistrationEnabled, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
