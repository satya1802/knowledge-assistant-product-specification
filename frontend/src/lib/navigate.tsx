import { useNavigate as useRouterNavigate } from "react-router-dom";

/**
 * `navigate(route)` in the preview posted a message to the host. Here it is
 * real routing, so the route slug the screen was written against has to
 * become the router path the scaffold mounted it at. This mirrors
 * `route_to_url_path` on the Python side; the two must agree or a link goes
 * nowhere.
 *
 * Kept byte-for-byte identical to `navigate.ts`: the two files used to
 * implement this differently (this one did a flat `/`-prefix, `navigate.ts`
 * normalised the route name into a kebab-case path), and because both
 * resolve from the same `@/lib/navigate` import specifier, which one a
 * screen actually got depended on bundler resolution order rather than on
 * anything in the code calling it. Every current route name is already
 * lowercase/kebab-case, so the two never visibly disagreed, but a future
 * route name could have silently gone to the wrong implementation. Until
 * one of these two files is removed, keep them identical.
 */
export function toPath(route: string): string {
  const trimmed = route.trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) return "/";
  return (
    "/" +
    trimmed
      .split("/")
      .map((segment) =>
        segment.startsWith(":")
          ? segment
          : segment.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      )
      .join("/")
  );
}

export type NavigateFn = (route: string) => void;

export function useNavigate(): NavigateFn {
  const navigate = useRouterNavigate();
  return (route: string) => navigate(toPath(route));
}
