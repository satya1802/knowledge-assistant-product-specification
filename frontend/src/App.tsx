import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import SignIn from "@/screens/SignIn";
import Chat from "@/screens/Chat";
import KnowledgeBase from "@/screens/KnowledgeBase";
import Account from "@/screens/Account";
import GettingStarted from "@/screens/GettingStarted";
import ApiReference from "@/screens/ApiReference";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";

/** /chat, /knowledge-base and /account require a session; everything else
 * (including /sign-in, /getting-started and /api-reference) stays public. */
function RequireAuth({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/sign-in" replace />;
  return children;
}

/**
 * The product's only shell. There is no separate nav rail here: the Chat
 * screen's own sidebar is the real product navigation (Knowledge base,
 * Getting started, API reference, account menu with Sign out); every other
 * screen carries its own back-to-chat affordance. This component is just
 * routing plus the auth gate.
 */
function AppShell() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/sign-in" element={user ? <Navigate to="/chat" replace /> : <SignIn />} />
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
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}
