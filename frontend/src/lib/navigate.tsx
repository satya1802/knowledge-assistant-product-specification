/**
 * Thin wrapper over react-router's `useNavigate`.
 *
 * Generated screens are written against route *names* ("chat",
 * "getting-started") rather than react-router paths, so every screen calls
 * `navigate("chat")` instead of importing react-router-dom directly and
 * remembering the leading slash. `App.tsx` mounts each screen at `/<name>`,
 * so prefixing here is all this has to do.
 */
import { useNavigate as useRouterNavigate } from "react-router-dom";

export type NavigateFn = (route: string) => void;

export function useNavigate(): NavigateFn {
  const routerNavigate = useRouterNavigate();
  return (route: string) => {
    routerNavigate(route.startsWith("/") ? route : `/${route}`);
  };
}
