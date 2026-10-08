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

// --- Knowledge base documents -------------------------------------------

export interface DocumentRecord {
  id: string;
  filename: string;
  file_type: string;
  size_bytes: number;
  status: "ready" | "processing" | "failed" | string;
  failure_reason: string | null;
  uploaded_by: string;
  uploaded_at: string;
  chunk_count: number;
}

export interface DocumentStats {
  total: number;
  ready: number;
  processing: number;
  failed: number;
}

export interface DocumentsResponse {
  documents: DocumentRecord[];
  stats: DocumentStats;
  result_count: number;
  max_upload_bytes: number;
}

export interface UploadRejection {
  filename: string;
  reason: string;
}

export interface UploadResult {
  accepted: DocumentRecord[];
  rejected: UploadRejection[];
}

/** GET /api/documents -- the full document list, stats and the server's
 * configured upload size ceiling. */
export function fetchDocuments(): Promise<DocumentsResponse> {
  return apiFetch<DocumentsResponse>("/api/documents");
}

/** DELETE /api/documents/{id}. */
export function deleteDocument(id: string): Promise<void> {
  return apiFetch<void>(`/api/documents/${id}`, { method: "DELETE" });
}

/** POST /api/documents, one file per request so the caller gets real,
 * per-file upload progress via XHR's `upload.onprogress` -- `fetch` has no
 * equivalent for request-body upload progress. */
export function uploadDocument(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/documents`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve((body as UploadResult) ?? { accepted: [], rejected: [] });
        return;
      }
      if (xhr.status === 401 && unauthorizedHandler) unauthorizedHandler();
      const detail =
        body &&
        typeof body === "object" &&
        typeof (body as { detail?: unknown }).detail === "string"
          ? (body as { detail: string }).detail
          : `POST /api/documents failed: ${xhr.status}`;
      reject(new ApiError(detail, xhr.status));
    };

    xhr.onerror = () => reject(new ApiError("Could not reach the server to upload this file.", 0));

    const formData = new FormData();
    formData.append("files", file);
    xhr.send(formData);
  });
}

/** GET /api/documents/{id}/download -- fetched as a blob (rather than a
 * plain navigation) so the request keeps `credentials: 'include'' like
 * every other call, then saved via a throwaway anchor element. */
export async function downloadDocument(id: string, filename: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/documents/${id}/download`, {
    credentials: "include",
  });
  if (!response.ok) {
    const fallback = `GET /api/documents/${id}/download failed: ${response.status}`;
    const message = await extractMessage(response, fallback);
    if (response.status === 401 && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(message, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export interface DocumentStreamHandlers {
  onStatus?: (doc: Partial<DocumentRecord> & { id: string }) => void;
  onDeleted?: (id: string) => void;
  onError?: (event: Event) => void;
}

/** Subscribes to GET /api/documents/stream. Returns an unsubscribe function
 * that closes the connection -- callers must invoke it on unmount so no
 * EventSource is left open. */
export function subscribeToDocumentStream(handlers: DocumentStreamHandlers): () => void {
  const source = new EventSource(`${API_BASE_URL}/api/documents/stream`, {
    withCredentials: true,
  });

  const handleStatus = (event: MessageEvent<string>) => {
    try {
      const data = JSON.parse(event.data) as Partial<DocumentRecord> & { id?: string };
      if (data && typeof data.id === "string")
        handlers.onStatus?.(data as Partial<DocumentRecord> & { id: string });
    } catch {
      // Not a JSON payload (e.g. a keep-alive comment) -- ignore it.
    }
  };

  const handleDeleted = (event: MessageEvent<string>) => {
    try {
      const data = JSON.parse(event.data) as { id?: string };
      if (data && typeof data.id === "string") handlers.onDeleted?.(data.id);
    } catch {
      // Ignore malformed payloads.
    }
  };

  source.addEventListener("document.status", handleStatus as EventListener);
  source.addEventListener("document.deleted", handleDeleted as EventListener);
  source.onmessage = handleStatus;
  if (handlers.onError) source.onerror = handlers.onError;

  return () => {
    source.removeEventListener("document.status", handleStatus as EventListener);
    source.removeEventListener("document.deleted", handleDeleted as EventListener);
    source.close();
  };
}
