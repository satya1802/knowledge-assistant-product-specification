import * as React from "react";

import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

type Method = "GET" | "POST" | "DELETE";

interface Param {
  name: string;
  in: "body" | "query" | "path" | "multipart";
  type: string;
  required: boolean;
  desc: string;
}

interface Endpoint {
  id: string;
  group: "Authentication" | "Documents" | "Chat" | "Conversations" | "Docs";
  method: Method;
  path: string;
  summary: string;
  auth: "Public" | "Session cookie";
  params: Param[];
  request: string;
  response: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    id: "auth-register",
    group: "Authentication",
    method: "POST",
    path: "/api/auth/register",
    summary: "Create a new employee account and sign in immediately.",
    auth: "Public",
    params: [
      { name: "name", in: "body", type: "string", required: true, desc: "Display name." },
      { name: "email", in: "body", type: "string", required: true, desc: "Must be unused." },
      {
        name: "password",
        in: "body",
        type: "string",
        required: true,
        desc: "Minimum 12 characters.",
      },
    ],
    request: [
      "POST /api/auth/register",
      "Content-Type: application/json",
      "",
      "{",
      '  "name": "<your name>",',
      '  "email": "<your email>",',
      '  "password": "<new password>"',
      "}",
    ].join("\n"),
    response: [
      "201 Created",
      "",
      "{",
      '  "id": "usr_example",',
      '  "name": "<your name>",',
      '  "email": "<your email>",',
      '  "is_admin": false',
      "}",
    ].join("\n"),
  },
  {
    id: "auth-login",
    group: "Authentication",
    method: "POST",
    path: "/api/auth/login",
    summary: "Exchange email and password for a session cookie.",
    auth: "Public",
    params: [
      { name: "email", in: "body", type: "string", required: true, desc: "Account email." },
      {
        name: "password",
        in: "body",
        type: "string",
        required: true,
        desc: "Compared against the stored hash.",
      },
    ],
    request: [
      "POST /api/auth/login",
      "Content-Type: application/json",
      "",
      "{",
      '  "email": "<your email>",',
      '  "password": "<your password>"',
      "}",
    ].join("\n"),
    response: [
      "200 OK",
      "Set-Cookie: ka_session=<opaque>; HttpOnly; Secure; SameSite=Lax",
      "",
      "{",
      '  "id": "usr_example",',
      '  "name": "<your name>",',
      '  "email": "<your email>",',
      '  "is_admin": false',
      "}",
    ].join("\n"),
  },
  {
    id: "auth-logout",
    group: "Authentication",
    method: "POST",
    path: "/api/auth/logout",
    summary: "Revoke the current session and clear the cookie.",
    auth: "Session cookie",
    params: [],
    request: ["POST /api/auth/logout", "Cookie: ka_session=<opaque>"].join("\n"),
    response: ["204 No Content", "Set-Cookie: ka_session=; Max-Age=0"].join("\n"),
  },
  {
    id: "auth-me",
    group: "Authentication",
    method: "GET",
    path: "/api/auth/me",
    summary: "Return the signed-in user, or null, and whether self-registration is open.",
    auth: "Session cookie",
    params: [],
    request: ["GET /api/auth/me", "Cookie: ka_session=<opaque>"].join("\n"),
    response: [
      "200 OK",
      "",
      "{",
      '  "user": { "id": "usr_example", "name": "<your name>", "is_admin": false },',
      '  "self_registration_enabled": true',
      "}",
    ].join("\n"),
  },
  {
    id: "auth-change-password",
    group: "Authentication",
    method: "POST",
    path: "/api/auth/change-password",
    summary: "Change your own password. There is no self-service reset link.",
    auth: "Session cookie",
    params: [
      {
        name: "current_password",
        in: "body",
        type: "string",
        required: true,
        desc: "Checked against the stored hash.",
      },
      {
        name: "new_password",
        in: "body",
        type: "string",
        required: true,
        desc: "Minimum 12 characters.",
      },
      {
        name: "confirm_password",
        in: "body",
        type: "string",
        required: true,
        desc: "Must match new_password.",
      },
    ],
    request: [
      "POST /api/auth/change-password",
      "Content-Type: application/json",
      "Cookie: ka_session=<opaque>",
      "",
      "{",
      '  "current_password": "<current password>",',
      '  "new_password": "<new password>",',
      '  "confirm_password": "<new password>"',
      "}",
    ].join("\n"),
    response: ["200 OK", "", '{ "detail": "Password changed successfully." }'].join("\n"),
  },
  {
    id: "documents-list",
    group: "Documents",
    method: "GET",
    path: "/api/documents",
    summary: "List the shared library with headline stats, search and filters.",
    auth: "Session cookie",
    params: [
      { name: "q", in: "query", type: "string", required: false, desc: "Filename search." },
      {
        name: "status",
        in: "query",
        type: "ready | processing | failed",
        required: false,
        desc: "Filter by status.",
      },
      {
        name: "type",
        in: "query",
        type: "pdf | docx | txt | md",
        required: false,
        desc: "Filter by file type.",
      },
    ],
    request: ["GET /api/documents?status=ready", "Cookie: ka_session=<opaque>"].join("\n"),
    response: [
      "200 OK",
      "",
      "{",
      '  "documents": [',
      '    { "id": "doc_example", "filename": "Expenses-Policy.pdf", "file_type": "pdf",',
      '      "size_bytes": 482113, "status": "ready", "failure_reason": null,',
      '      "uploaded_at": "2026-10-06T09:41:17Z" }',
      "  ],",
      '  "stats": { "total": 1, "ready": 1, "processing": 0, "failed": 0 }',
      "}",
    ].join("\n"),
  },
  {
    id: "documents-upload",
    group: "Documents",
    method: "POST",
    path: "/api/documents",
    summary: "Upload one or more files into the shared knowledge base.",
    auth: "Session cookie",
    params: [
      {
        name: "files",
        in: "multipart",
        type: "file[]",
        required: true,
        desc: "PDF, DOCX, TXT or Markdown.",
      },
    ],
    request: [
      "POST /api/documents",
      "Content-Type: multipart/form-data",
      "Cookie: ka_session=<opaque>",
      "",
      "files=@Onboarding-Checklist.md",
    ].join("\n"),
    response: [
      "201 Created",
      "",
      "{",
      '  "documents": [',
      '    { "id": "doc_example", "filename": "Onboarding-Checklist.md", "status": "processing" }',
      "  ]",
      "}",
    ].join("\n"),
  },
  {
    id: "documents-stream",
    group: "Documents",
    method: "GET",
    path: "/api/documents/stream",
    summary: "Server-sent events for live ingestion status on the Knowledge base page.",
    auth: "Session cookie",
    params: [],
    request: [
      "GET /api/documents/stream",
      "Accept: text/event-stream",
      "Cookie: ka_session=<opaque>",
    ].join("\n"),
    response: [
      "200 OK",
      "Content-Type: text/event-stream",
      "",
      "event: document.status",
      'data: {"id":"doc_example","status":"ready"}',
    ].join("\n"),
  },
  {
    id: "documents-download",
    group: "Documents",
    method: "GET",
    path: "/api/documents/{document_id}/download",
    summary: "Download the original uploaded file, unchanged.",
    auth: "Session cookie",
    params: [
      {
        name: "document_id",
        in: "path",
        type: "string",
        required: true,
        desc: "Document identifier.",
      },
    ],
    request: [
      "GET /api/documents/doc_example/download",
      "Cookie: ka_session=<opaque>",
    ].join("\n"),
    response: [
      "200 OK",
      "Content-Type: application/pdf",
      'Content-Disposition: attachment; filename="Expenses-Policy.pdf"',
      "",
      "<binary file contents>",
    ].join("\n"),
  },
  {
    id: "documents-delete",
    group: "Documents",
    method: "DELETE",
    path: "/api/documents/{document_id}",
    summary: "Permanently delete a document, its chunks and its embeddings.",
    auth: "Session cookie",
    params: [
      {
        name: "document_id",
        in: "path",
        type: "string",
        required: true,
        desc: "Document identifier.",
      },
    ],
    request: ["DELETE /api/documents/doc_example", "Cookie: ka_session=<opaque>"].join("\n"),
    response: ["204 No Content"].join("\n"),
  },
  {
    id: "chat-send",
    group: "Chat",
    method: "POST",
    path: "/api/chat",
    summary: "Ask a question and stream the cited answer back token by token.",
    auth: "Session cookie",
    params: [
      {
        name: "conversation_id",
        in: "body",
        type: "string | null",
        required: false,
        desc: "Null starts a new conversation.",
      },
      { name: "content", in: "body", type: "string", required: true, desc: "The question." },
    ],
    request: [
      "POST /api/chat",
      "Content-Type: application/json",
      "Cookie: ka_session=<opaque>",
      "",
      "{",
      '  "conversation_id": null,',
      '  "content": "What is the receipt threshold for expenses?"',
      "}",
    ].join("\n"),
    response: [
      "200 OK",
      "Content-Type: text/event-stream",
      "",
      "event: message.start",
      'data: {"conversation_id":"cnv_example","message_id":"msg_example"}',
      "",
      "event: token",
      'data: {"text":"Any expense over "}',
      "",
      "event: citation",
      'data: {"chip_number":1,"document_id":"doc_example","excerpt":"…"}',
      "",
      "event: message.end",
      'data: {"message_id":"msg_example","is_general_knowledge":false}',
    ].join("\n"),
  },
  {
    id: "chat-regenerate",
    group: "Chat",
    method: "POST",
    path: "/api/chat/{message_id}/regenerate",
    summary: "Re-ask the same question and stream a fresh answer in its place.",
    auth: "Session cookie",
    params: [
      {
        name: "message_id",
        in: "path",
        type: "string",
        required: true,
        desc: "Assistant message to replace.",
      },
    ],
    request: [
      "POST /api/chat/msg_example/regenerate",
      "Cookie: ka_session=<opaque>",
    ].join("\n"),
    response: [
      "200 OK",
      "Content-Type: text/event-stream",
      "",
      "event: message.start",
      'data: {"message_id":"msg_example"}',
    ].join("\n"),
  },
  {
    id: "conversations-list",
    group: "Conversations",
    method: "GET",
    path: "/api/conversations",
    summary: "List your own conversations, newest first.",
    auth: "Session cookie",
    params: [
      { name: "q", in: "query", type: "string", required: false, desc: "Search title or text." },
    ],
    request: ["GET /api/conversations", "Cookie: ka_session=<opaque>"].join("\n"),
    response: [
      "200 OK",
      "",
      "{",
      '  "conversations": [',
      '    { "id": "cnv_example", "title": "Receipt threshold for expenses" }',
      "  ]",
      "}",
    ].join("\n"),
  },
  {
    id: "conversations-get",
    group: "Conversations",
    method: "GET",
    path: "/api/conversations/{conversation_id}",
    summary: "Reopen one conversation with its full message thread and citations.",
    auth: "Session cookie",
    params: [
      {
        name: "conversation_id",
        in: "path",
        type: "string",
        required: true,
        desc: "Conversation identifier.",
      },
    ],
    request: ["GET /api/conversations/cnv_example", "Cookie: ka_session=<opaque>"].join("\n"),
    response: [
      "200 OK",
      "",
      "{",
      '  "id": "cnv_example",',
      '  "title": "Receipt threshold for expenses",',
      '  "messages": [',
      '    { "id": "msg_example", "role": "user", "content": "…" }',
      "  ]",
      "}",
    ].join("\n"),
  },
  {
    id: "conversations-delete",
    group: "Conversations",
    method: "DELETE",
    path: "/api/conversations/{conversation_id}",
    summary: "Permanently delete one of your conversations and all its messages.",
    auth: "Session cookie",
    params: [
      {
        name: "conversation_id",
        in: "path",
        type: "string",
        required: true,
        desc: "Conversation identifier.",
      },
    ],
    request: ["DELETE /api/conversations/cnv_example", "Cookie: ka_session=<opaque>"].join("\n"),
    response: ["204 No Content"].join("\n"),
  },
  {
    id: "docs-getting-started",
    group: "Docs",
    method: "GET",
    path: "/api/docs/getting-started",
    summary: "Content backing the in-app Getting started guide.",
    auth: "Public",
    params: [],
    request: ["GET /api/docs/getting-started"].join("\n"),
    response: ["200 OK", "", '{ "endpoint": "GET /api/docs/getting-started" }'].join("\n"),
  },
  {
    id: "docs-api-reference",
    group: "Docs",
    method: "GET",
    path: "/api/docs/api-reference",
    summary: "Content backing this API reference page.",
    auth: "Public",
    params: [],
    request: ["GET /api/docs/api-reference"].join("\n"),
    response: ["200 OK", "", '{ "endpoint": "GET /api/docs/api-reference" }'].join("\n"),
  },
];

const GROUP_ORDER: Endpoint["group"][] = [
  "Authentication",
  "Documents",
  "Chat",
  "Conversations",
  "Docs",
];

const METHOD_STYLE: Record<Method, { color: string; backgroundColor: string; borderColor: string }> = {
  GET: {
    color: "#9CC5FF",
    backgroundColor: "rgba(91,156,248,0.13)",
    borderColor: "rgba(91,156,248,0.38)",
  },
  POST: {
    color: "#F4A259",
    backgroundColor: "rgba(244,162,89,0.13)",
    borderColor: "rgba(244,162,89,0.40)",
  },
  DELETE: {
    color: "#F3938A",
    backgroundColor: "rgba(240,138,128,0.13)",
    borderColor: "rgba(240,138,128,0.40)",
  },
};

const PANEL = "#171C22";
const LINE = "#262E38";
const TEXT = "#E7ECF2";

export default function ApiReference() {
  const navigate = useNavigate();
  const muted = brand.neutralColor;

  return (
    <div
      style={{ backgroundColor: brand.backgroundColor, color: TEXT, fontFamily: brand.fontBody }}
      className="min-h-full w-full"
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate("chat")}
            className="inline-flex items-center gap-2 rounded-[var(--brand-radius)] px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: brand.primaryColor, color: "#0B0F13" }}
          >
            <Icons.ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to chat
          </button>
        </div>

        <header className="max-w-3xl">
          <p
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: brand.accentColor }}
          >
            Knowledge Assistant · v1
          </p>
          <h1
            className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ fontFamily: brand.fontHeading }}
          >
            API reference
          </h1>
          <p className="mt-3 text-[15px] leading-7" style={{ color: muted }}>
            Every HTTP endpoint behind this product: authentication, the shared knowledge base,
            streamed chat and your private conversations. These are the application&rsquo;s own
            endpoints — nothing here calls a model provider directly, and no key or credential
            value appears anywhere on this page.
          </p>
        </header>

        <div className="mt-10 h-px w-full" style={{ backgroundColor: LINE }} />

        <div className="mt-10 space-y-12">
          {GROUP_ORDER.map((group) => {
            const groupEndpoints = ENDPOINTS.filter((e) => e.group === group);
            return (
              <section key={group} aria-labelledby={`group-${group}`}>
                <h2
                  id={`group-${group}`}
                  className="text-lg font-semibold tracking-tight sm:text-xl"
                  style={{ fontFamily: brand.fontHeading }}
                >
                  {group}
                </h2>
                <ul className="mt-4 space-y-4">
                  {groupEndpoints.map((e) => (
                    <li
                      key={e.id}
                      className="overflow-hidden rounded-xl border"
                      style={{ borderColor: LINE, backgroundColor: PANEL, borderRadius: brand.radius }}
                    >
                      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-4" style={{ borderColor: LINE }}>
                        <span
                          className="shrink-0 rounded border px-2 py-0.5 text-[11px] font-bold tracking-wide"
                          style={{
                            ...METHOD_STYLE[e.method],
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          }}
                        >
                          {e.method}
                        </span>
                        <code
                          className="break-all text-[14px] font-semibold"
                          style={{
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            color: TEXT,
                          }}
                        >
                          {e.path}
                        </code>
                        <span
                          className="ml-auto shrink-0 rounded-full border px-2.5 py-0.5 text-[11px]"
                          style={{ borderColor: LINE, color: muted }}
                        >
                          {e.auth}
                        </span>
                      </div>

                      <div className="px-4 py-5">
                        <p className="text-sm leading-7" style={{ color: "#C3CCD6" }}>
                          {e.summary}
                        </p>

                        {e.params.length > 0 && (
                          <>
                            <h3
                              className="mt-5 text-xs font-semibold uppercase tracking-wider"
                              style={{ color: muted }}
                            >
                              Parameters
                            </h3>
                            <dl className="mt-3 space-y-3">
                              {e.params.map((p) => (
                                <div key={p.name}>
                                  <dt className="flex flex-wrap items-center gap-2">
                                    <code
                                      className="text-[13px]"
                                      style={{
                                        fontFamily:
                                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                                        color: TEXT,
                                      }}
                                    >
                                      {p.name}
                                    </code>
                                    <span className="text-xs" style={{ color: muted }}>
                                      {p.in} · {p.type} · {p.required ? "required" : "optional"}
                                    </span>
                                  </dt>
                                  <dd
                                    className="mt-1 text-sm leading-6"
                                    style={{ color: "#C3CCD6" }}
                                  >
                                    {p.desc}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </>
                        )}

                        <h3
                          className="mt-5 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: muted }}
                        >
                          Example request
                        </h3>
                        <pre
                          className="mt-2 overflow-x-auto rounded-lg border px-4 py-3 text-[12.5px] leading-6"
                          style={{
                            borderColor: LINE,
                            backgroundColor: "#0D1115",
                            color: "#CBD5E1",
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          }}
                        >
                          <code>{e.request}</code>
                        </pre>

                        <h3
                          className="mt-5 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: muted }}
                        >
                          Example response
                        </h3>
                        <pre
                          className="mt-2 overflow-x-auto rounded-lg border px-4 py-3 text-[12.5px] leading-6"
                          style={{
                            borderColor: LINE,
                            backgroundColor: "#0D1115",
                            color: "#CBD5E1",
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                          }}
                        >
                          <code>{e.response}</code>
                        </pre>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
