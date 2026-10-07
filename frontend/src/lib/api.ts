/// <reference types="vite/client" />
// Without the reference above, `import.meta.env` is not typed and `tsc --noEmit` fails --
// which `vite build` does not catch, because it tree-shakes this module out when no screen
// imports it yet.
//
// Where the generated API lives.
//
// Set at build time: the platform bakes the deployed API URL into the frontend build. The
// fallback is the local backend so a bare `npm run dev` still points somewhere real.
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/** Thrown by `apiFetch` for any non-2xx response. `message` is the server's own
 * detail text whenever one was sent, never client-invented wording. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Registered once by the auth provider so any call anywhere that gets a 401
 * clears client auth state and redirects to sign-in, without every screen
 * having to know about it. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

async function extractMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.clone().json();
    if (body && typeof body.detail === "string") return body.detail;
    if (body && typeof body.message === "string") return body.message;
  } catch {
    // Body was not JSON, or empty. Fall through to the generic message.
  }
  return fallback;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const fallback = `${init?.method ?? "GET"} ${path} failed: ${response.status}`;
    const message = await extractMessage(response, fallback);
    if (response.status === 401 && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(message, response.status);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
