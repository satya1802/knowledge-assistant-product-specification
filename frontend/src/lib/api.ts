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

// --- Chat & conversations -------------------------------------------------

export interface Citation {
  chip_number: number;
  document_id: string;
  excerpt: string;
  document_filename?: string;
  document_file_type?: string;
  document_size_bytes?: number;
  document_uploaded_by?: string;
  document_uploaded_at?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  is_general_knowledge?: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  messages: ChatMessage[];
}

/** GET /api/conversations/{id} -- the full persisted thread, used when a
 * conversation is reopened so it renders identically to what was streamed. */
export function fetchConversation(id: string): Promise<Conversation> {
  return apiFetch<Conversation>(`/api/conversations/${id}`);
}

export interface ChatStartData {
  conversation_id?: string;
  message_id?: string;
}

export interface ChatEndData {
  message_id?: string;
  is_general_knowledge?: boolean;
}

export interface ChatStreamHandlers {
  onStart?: (data: ChatStartData) => void;
  onToken?: (text: string) => void;
  onCitation?: (citation: Citation) => void;
  onEnd?: (data: ChatEndData) => void;
  onError?: (message: string) => void;
}

interface ChatStreamRequest {
  conversation_id: string | null;
  content: string;
}

function parseSseFrame(frame: string): { event: string; data: string } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

/** Maps the backend's own SSE event names -- `message.start`, `token`,
 * `citation` (one per source, not a batch), `message.end` and `error` --
 * onto the typed handlers above. */
function dispatchChatFrame(event: string, data: string, handlers: ChatStreamHandlers): void {
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    if (event === "message.start") {
      handlers.onStart?.({
        conversation_id:
          typeof parsed.conversation_id === "string" ? parsed.conversation_id : undefined,
        message_id: typeof parsed.message_id === "string" ? parsed.message_id : undefined,
      });
    } else if (event === "token" && typeof parsed.text === "string") {
      handlers.onToken?.(parsed.text);
    } else if (event === "citation") {
      handlers.onCitation?.({
        chip_number: typeof parsed.chip_number === "number" ? parsed.chip_number : 0,
        document_id: typeof parsed.document_id === "string" ? parsed.document_id : "",
        excerpt: typeof parsed.excerpt === "string" ? parsed.excerpt : "",
      });
    } else if (event === "message.end") {
      handlers.onEnd?.({
        message_id: typeof parsed.message_id === "string" ? parsed.message_id : undefined,
        is_general_knowledge: !!parsed.is_general_knowledge,
      });
    } else if (event === "error") {
      const message =
        typeof parsed.message === "string"
          ? parsed.message
          : "Something went wrong while generating this answer.";
      handlers.onError?.(message);
    }
  } catch {
    // Not JSON (e.g. a stray keep-alive comment) -- ignore it.
  }
}

/** Shared by `streamChat` and `regenerateChat`: issues the POST, then reads
 * and parses the SSE body stream by hand -- `EventSource` cannot send a POST
 * body, so the frames ("event: ...\ndata: ...\n\n") are decoded and split
 * here instead. Resolves once the stream ends, whether by a "message.end"
 * event, an "error" event, or the caller aborting via `signal`. */
async function consumeChatStream(
  path: string,
  init: RequestInit,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      signal,
    });
  } catch {
    if (signal?.aborted) return;
    handlers.onError?.("Could not reach the server. Check your connection and try again.");
    return;
  }

  if (!response.ok) {
    if (response.status === 401 && unauthorizedHandler) unauthorizedHandler();
    const fallback = `${init.method ?? "POST"} ${path} failed: ${response.status}`;
    const message = await extractMessage(response, fallback);
    handlers.onError?.(message);
    return;
  }
  if (!response.body) {
    handlers.onError?.("The server did not return a stream.");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseSseFrame(frame);
        if (parsed) dispatchChatFrame(parsed.event, parsed.data, handlers);
        boundary = buffer.indexOf("\n\n");
      }
    }
  } catch {
    if (signal?.aborted) return;
    handlers.onError?.("The connection was lost while the answer was streaming.");
  }
}

/** POST /api/chat -- `content` plus the conversation to continue, or `null`
 * to start a new one. */
export function streamChat(
  request: ChatStreamRequest,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return consumeChatStream(
    "/api/chat",
    { method: "POST", body: JSON.stringify(request) },
    handlers,
    signal,
  );
}

/** POST /api/chat/{message_id}/regenerate -- re-runs the answer for an
 * existing assistant message, streamed with the same event shape as
 * `streamChat`, in the same conversation context. */
export function regenerateChat(
  messageId: string,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return consumeChatStream(
    `/api/chat/${messageId}/regenerate`,
    { method: "POST" },
    handlers,
    signal,
  );
}
