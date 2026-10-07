import type { ReactElement } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";

import SignIn from "@/screens/SignIn";
import Chat from "@/screens/Chat";
import KnowledgeBase from "@/screens/KnowledgeBase";
import Account from "@/screens/Account";
import GettingStarted from "@/screens/GettingStarted";
import ApiReference from "@/screens/ApiReference";
import { AuthProvider, useAuth } from "@/lib/auth";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "block rounded-[var(--brand-radius)] px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-[var(--brand-hover)] text-[var(--brand-fg)]" : "text-[var(--brand-fg-muted)]",
  ].join(" ");

/** /chat, /knowledge-base and /account require a session; everything else
 * (including /sign-in, /getting-started and /api-reference) stays public. */
function RequireAuth({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/sign-in" replace />;
  return children;
}

function AppShell() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside
        className="w-56 shrink-0 border-r p-4"
        style={{
          backgroundColor: "var(--brand-surface)",
          borderColor: "var(--brand-border)",
        }}
      >
        <p
          className="mb-4 px-3 text-sm font-semibold"
          style={{ fontFamily: "var(--brand-font-heading)" }}
        >
          {"Knowledge Assistant · Product specification"}
        </p>
        <nav className="flex flex-col gap-1">
          <NavLink to="/sign-in" className={navLinkClass}>
            {"Sign in"}
          </NavLink>
          <NavLink to="/chat" className={navLinkClass}>
            {"Chat"}
          </NavLink>
          <NavLink to="/knowledge-base" className={navLinkClass}>
            {"Knowledge base"}
          </NavLink>
          <NavLink to="/account" className={navLinkClass}>
            {"Account"}
          </NavLink>
          <NavLink to="/getting-started" className={navLinkClass}>
            {"Getting started"}
          </NavLink>
          <NavLink to="/api-reference" className={navLinkClass}>
            {"API reference"}
          </NavLink>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route
            path="/sign-in"
            element={user ? <Navigate to="/chat" replace /> : <SignIn />}
          />
          <Route
            path="/chat"
            element={
              <RequireAuth>
                <Chat />
              </RequireAuth>
            }
          />
          <Route
            path="/knowledge-base"
            element={
              <RequireAuth>
                <KnowledgeBase />
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <Account />
              </RequireAuth>
            }
          />
          <Route path="/getting-started" element={<GettingStarted />} />
          <Route path="/api-reference" element={<ApiReference />} />
          <Route path="*" element={<Navigate to="/sign-in" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
