/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

const { Empty } = UI;
const { Search, Check, X, ChevronRight, ChevronDown, FileText, Filter, Download, Upload, ArrowRight, AlertCircle } = Icons;

const BASE_URL = "https://assistant.northwind.example";

const GROUPS = ["All", "Authentication", "Documents", "Chat", "Conversations", "Help"];

const ENDPOINTS = [
  {
    id: "auth-register",
    group: "Authentication",
    method: "POST",
    path: "/api/auth/register",
    summary: "Create a new employee account and sign in immediately.",
    auth: "Public",
    note: "Rejected with 403 when self-registration is switched off in backend/.env. The first account ever created on an instance is flagged is_admin.",
    params: [
      { name: "name", in: "body", type: "string", required: true, desc: "Display name shown in the greeting and account menu." },
      { name: "email", in: "body", type: "string", required: true, desc: "Must be unused. Stored lower-cased." },
      { name: "password", in: "body", type: "string", required: true, desc: "Minimum 12 characters. Stored only as a one-way hash." }
    ],
    request: [
      "curl -X POST https://assistant.northwind.example/api/auth/register \\",
      "  -H 'Content-Type: application/json' \\",
      "  -c cookies.txt \\",
      "  -d '{\"name\":\"Priya Raman\",",
      "       \"email\":\"priya.raman@northwind.example\",",
      "       \"password\":\"<new password>\"}'"
    ].join("\n"),
    response: [
      "201 Created",
      "Set-Cookie: ka_session=<opaque>; HttpOnly; Secure; SameSite=Lax; Path=/",
      "",
      "{",
      "  \"user\": {",
      "    \"id\": \"usr_9fa31c\",",
      "    \"name\": \"Priya Raman\",",
      "    \"email\": \"priya.raman@northwind.example\",",
      "    \"is_admin\": false,",
      "    \"is_enabled\": true,",
      "    \"theme\": \"system\",",
      "    \"created_at\": \"2026-10-05T08:14:02Z\"",
      "  }",
      "}"
    ].join("\n"),
    errors: [
      { code: "400", text: "\"Those details cannot be used.\" — identical whether or not the email is already registered." },
      { code: "403", text: "\"Account creation is disabled on this instance.\"" }
    ]
  },
  {
    id: "auth-login",
    group: "Authentication",
    method: "POST",
    path: "/api/auth/login",
    summary: "Exchange email and password for a session cookie.",
    auth: "Public",
    note: "Five failed attempts for one email within 15 minutes lock that email for 15 minutes; a correct password is refused while the lock holds.",
    params: [
      { name: "email", in: "body", type: "string", required: true, desc: "Account email address." },
      { name: "password", in: "body", type: "string", required: true, desc: "Plain password, compared against the stored hash." }
    ],
    request: [
      "curl -X POST https://assistant.northwind.example/api/auth/login \\",
      "  -H 'Content-Type: application/json' \\",
      "  -c cookies.txt \\",
      "  -d '{\"email\":\"marcus.webb@northwind.example\",",
      "       \"password\":\"<your password>\"}'"
    ].join("\n"),
    response: [
      "200 OK",
      "Set-Cookie: ka_session=<opaque>; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000",
      "",
      "{",
      "  \"user\": { \"id\": \"usr_3c7e40\", \"name\": \"Marcus Webb\", \"is_admin\": true },",
      "  \"session\": { \"expires_at\": \"2026-11-06T07:55:31Z\" }",
      "}"
    ].join("\n"),
    errors: [
      { code: "401", text: "\"Email or password is incorrect.\" — returned for an unknown email and for a wrong password alike." },
      { code: "423", text: "\"Too many sign-in attempts. Try again in 15 minutes.\" — reveals nothing about whether the account exists." }
    ]
  },
  {
    id: "auth-logout",
    group: "Authentication",
    method: "POST",
    path: "/api/auth/logout",
    summary: "Revoke the current session server-side and clear the cookie.",
    auth: "Session cookie",
    note: "Sets sessions.revoked_at. Any cached page restored with the browser back button will fail its next data call with 401.",
    params: [],
    request: [
      "curl -X POST https://assistant.northwind.example/api/auth/logout \\",
      "  -b cookies.txt"
    ].join("\n"),
    response: [
      "204 No Content",
      "Set-Cookie: ka_session=; Max-Age=0; Path=/"
    ].join("\n"),
    errors: [{ code: "401", text: "No valid session cookie was presented." }]
  },
  {
    id: "auth-me",
    group: "Authentication",
    method: "GET",
    path: "/api/auth/me",
    summary: "Return the signed-in user and session expiry.",
    auth: "Session cookie",
    note: "Called on application start to decide between the welcome screen and the sign-in page.",
    params: [],
    request: [
      "curl https://assistant.northwind.example/api/auth/me \\",
      "  -b cookies.txt"
    ].join("\n"),
    response: [
      "200 OK",
      "",
      "{",
      "  \"id\": \"usr_3c7e40\",",
      "  \"name\": \"Marcus Webb\",",
      "  \"email\": \"marcus.webb@northwind.example\",",
      "  \"is_admin\": true,",
      "  \"is_enabled\": true,",
      "  \"theme\": \"dark\",",
      "  \"created_at\": \"2026-02-11T10:03:44Z\"",
      "}"
    ].join("\n"),
    errors: [{ code: "401", text: "Session missing, expired, revoked, or the account has been disabled." }]
  },
  {
    id: "auth-change-password",
    group: "Authentication",
    method: "POST",
    path: "/api/auth/change-password",
    summary: "Change your own password without an email link.",
    auth: "Session cookie",
    note: "There is no email service, so there is no self-service reset. A forgotten password is an operator task.",
    params: [
      { name: "current_password", in: "body", type: "string", required: true, desc: "Checked against the stored hash." },
      { name: "new_password", in: "body", type: "string", required: true, desc: "Minimum 12 characters." },
      { name: "confirm_password", in: "body", type: "string", required: true, desc: "Must match new_password exactly." }
    ],
    request: [
      "curl -X POST https://assistant.northwind.example/api/auth/change-password \\",
      "  -H 'Content-Type: application/json' -b cookies.txt \\",
      "  -d '{\"current_password\":\"<current>\",",
      "       \"new_password\":\"<new>\",",
      "       \"confirm_password\":\"<new>\"}'"
    ].join("\n"),
    response: [
      "200 OK",
      "",
      "{ \"status\": \"password_changed\", \"changed_at\": \"2026-10-07T11:22:09Z\" }"
    ].join("\n"),
    errors: [
      { code: "400", text: "{ \"field\": \"current_password\", \"message\": \"Current password is incorrect.\" }" },
      { code: "400", text: "{ \"field\": \"confirm_password\", \"message\": \"The two passwords do not match.\" }" }
    ]
  },
  {
    id: "documents-list",
    group: "Documents",
    method: "GET",
    path: "/api/documents",
    summary: "List the shared library with headline stats, search and filters.",
    auth: "Session cookie",
    note: "The library is open: every signed-in user sees every document, whoever uploaded it.",
    params: [
      { name: "search", in: "query", type: "string", required: false, desc: "Case-insensitive substring match on filename." },
      { name: "status", in: "query", type: "ready | processing | failed", required: false, desc: "Repeatable. Omit for all statuses." },
      { name: "file_type", in: "query", type: "pdf | docx | txt | md", required: false, desc: "Repeatable." },
      { name: "limit", in: "query", type: "integer", required: false, desc: "Default 50, maximum 200." },
      { name: "offset", in: "query", type: "integer", required: false, desc: "Default 0." }
    ],
    request: [
      "curl -G https://assistant.northwind.example/api/documents \\",
      "  -b cookies.txt \\",
      "  --data-urlencode 'search=expenses' \\",
      "  --data-urlencode 'status=ready' \\",
      "  --data-urlencode 'file_type=pdf'"
    ].join("\n"),
    response: [
      "200 OK",
      "",
      "{",
      "  \"stats\": { \"total\": 128, \"ready\": 124, \"processing\": 2, \"failed\": 2 },",
      "  \"documents\": [",
      "    {",
      "      \"id\": \"doc_41b9c2\",",
      "      \"filename\": \"Expenses-Policy-2026.pdf\",",
      "      \"file_type\": \"pdf\",",
      "      \"size_bytes\": 482113,",
      "      \"status\": \"ready\",",
      "      \"failure_reason\": null,",
      "      \"uploaded_by\": { \"id\": \"usr_3c7e40\", \"name\": \"Marcus Webb\" },",
      "      \"uploaded_at\": \"2026-10-06T09:41:17Z\"",
      "    },",
      "    {",
      "      \"id\": \"doc_40ff17\",",
      "      \"filename\": \"Signed-Lease-Scan.pdf\",",
      "      \"status\": \"failed\",",
      "      \"failure_reason\": \"No extractable text — the file appears to be a scan.\"",
      "    }",
      "  ],",
      "  \"total_matching\": 6",
      "}"
    ].join("\n"),
    errors: [{ code: "401", text: "No valid session." }]
  },
  {
    id: "documents-upload",
    group: "Documents",
    method: "POST",
    path: "/api/documents",
    summary: "Upload one or more files into the shared knowledge base.",
    auth: "Session cookie",
    note: "Accepted files return immediately with status processing; parsing, chunking and embedding continue in the background and normally finish within seconds.",
    params: [
      { name: "files", in: "multipart", type: "file[]", required: true, desc: "Repeatable. PDF, DOCX, TXT or Markdown, 25 MB each." }
    ],
    request: [
      "curl -X POST https://assistant.northwind.example/api/documents \\",
      "  -b cookies.txt \\",
      "  -F 'files=@Onboarding-Checklist.md' \\",
      "  -F 'files=@Q3-Support-Handbook.docx' \\",
      "  -F 'files=@org-chart.pptx'"
    ].join("\n"),
    response: [
      "202 Accepted",
      "",
      "{",
      "  \"accepted\": [",
      "    { \"id\": \"doc_4210aa\", \"filename\": \"Onboarding-Checklist.md\", \"status\": \"processing\" },",
      "    { \"id\": \"doc_4210ab\", \"filename\": \"Q3-Support-Handbook.docx\", \"status\": \"processing\" }",
      "  ],",
      "  \"rejected\": [",
      "    { \"filename\": \"org-chart.pptx\",",
      "      \"reason\": \"Unsupported type. Upload PDF, DOCX, TXT or Markdown.\" }",
      "  ]",
      "}"
    ].join("\n"),
    errors: [
      { code: "413", text: "\"That file is larger than the 25 MB limit.\" — checked before any processing." },
      { code: "415", text: "Every file in the batch was an unsupported type." }
    ]
  },
  {
    id: "documents-stream",
    group: "Documents",
    method: "GET",
    path: "/api/documents/stream",
    summary: "Server-sent events for live ingestion status on the Knowledge base page.",
    auth: "Session cookie",
    note: "Keeps the stats and table current without a manual refresh. Comment lines are keep-alives sent every 15 seconds.",
    params: [],
    request: [
      "curl -N https://assistant.northwind.example/api/documents/stream \\",
      "  -b cookies.txt \\",
      "  -H 'Accept: text/event-stream'"
    ].join("\n"),
    response: [
      "200 OK",
      "Content-Type: text/event-stream",
      "",
      "event: document.status",
      "data: {\"id\":\"doc_4210aa\",\"status\":\"ready\",\"chunk_count\":38}",
      "",
      ": keep-alive",
      "",
      "event: document.status",
      "data: {\"id\":\"doc_4210ab\",\"status\":\"failed\",",
      "       \"failure_reason\":\"The document is password-protected.\"}"
    ].join("\n"),
    errors: [{ code: "401", text: "No valid session — the stream is never opened." }]
  },
  {
    id: "documents-download",
    group: "Documents",
    method: "GET",
    path: "/api/documents/{id}/download",
    summary: "Download the original uploaded file, unchanged.",
    auth: "Session cookie",
    note: "Returns the stored bytes with the original filename and content type. Unauthenticated requests never receive file content.",
    params: [
      { name: "id", in: "path", type: "string", required: true, desc: "Document identifier, e.g. doc_41b9c2." }
    ],
    request: [
      "curl -OJ https://assistant.northwind.example/api/documents/doc_41b9c2/download \\",
      "  -b cookies.txt"
    ].join("\n"),
    response: [
      "200 OK",
      "Content-Type: application/pdf",
      "Content-Disposition: attachment; filename=\"Expenses-Policy-2026.pdf\"",
      "Content-Length: 482113",
      "",
      "<binary file contents>"
    ].join("\n"),
    errors: [
      { code: "401", text: "No valid session." },
      { code: "404", text: "The document has been deleted or never existed." }
    ]
  },
  {
    id: "documents-delete",
    group: "Documents",
    method: "DELETE",
    path: "/api/documents/{id}",
    summary: "Permanently delete a document, its chunks and its embeddings.",
    auth: "Session cookie",
    note: "Any signed-in user may delete any document; administrators have no extra privilege. There is no recycle bin — deletion cannot be undone, and the document stops being cited straight away.",
    params: [
      { name: "id", in: "path", type: "string", required: true, desc: "Document identifier." }
    ],
    request: [
      "curl -X DELETE https://assistant.northwind.example/api/documents/doc_40ff17 \\",
      "  -b cookies.txt"
    ].join("\n"),
    response: [
      "204 No Content"
    ].join("\n"),
    errors: [{ code: "404", text: "Already deleted — safe to treat as success." }]
  },
  {
    id: "chat-send",
    group: "Chat",
    method: "POST",
    path: "/api/chat",
    summary: "Ask a question and stream the cited answer back token by token.",
    auth: "Session cookie",
    note: "The question is embedded, the closest chunks are retrieved, and only chunks above the relevance threshold are used. Close the connection to stop; the partial answer is kept and marked is_stopped.",
    params: [
      { name: "conversation_id", in: "body", type: "string | null", required: false, desc: "Null starts a new conversation titled from your first question." },
      { name: "content", in: "body", type: "string", required: true, desc: "The question. Whitespace-only input is rejected." }
    ],
    request: [
      "curl -N -X POST https://assistant.northwind.example/api/chat \\",
      "  -H 'Content-Type: application/json' -b cookies.txt \\",
      "  -d '{\"conversation_id\":\"cnv_77a1e9\",",
      "       \"content\":\"What is the receipt threshold for expenses?\"}'"
    ].join("\n"),
    response: [
      "200 OK",
      "Content-Type: text/event-stream",
      "",
      "event: message.start",
      "data: {\"conversation_id\":\"cnv_77a1e9\",\"message_id\":\"msg_5f20c1\",",
      "       \"is_general_knowledge\":false}",
      "",
      "event: token",
      "data: {\"text\":\"Any expense over \"}",
      "",
      "event: citation",
      "data: {\"chip_number\":1,\"document_id\":\"doc_41b9c2\",\"chunk_id\":\"chk_993104\",",
      "       \"excerpt\":\"Claims above GBP 75 must be accompanied by an itemised receipt…\"}",
      "",
      ": keep-alive",
      "",
      "event: message.end",
      "data: {\"message_id\":\"msg_5f20c1\",\"is_stopped\":false,\"citation_count\":2}"
    ].join("\n"),
    errors: [
      { code: "422", text: "Empty or whitespace-only content." },
      { code: "503", text: "The provider stayed overloaded after automatic retries — the client offers Retry." }
    ]
  },
  {
    id: "chat-regenerate",
    group: "Chat",
    method: "POST",
    path: "/api/chat/{message_id}/regenerate",
    summary: "Re-ask the same question with the same context and stream a fresh answer.",
    auth: "Session cookie",
    note: "Replaces the previous assistant message in place, including its citations. Works on stopped and failed answers as well as completed ones.",
    params: [
      { name: "message_id", in: "path", type: "string", required: true, desc: "Identifier of the assistant message to replace." }
    ],
    request: [
      "curl -N -X POST \\",
      "  https://assistant.northwind.example/api/chat/msg_5f20c1/regenerate \\",
      "  -b cookies.txt"
    ].join("\n"),
    response: [
      "200 OK",
      "Content-Type: text/event-stream",
      "",
      "event: message.start",
      "data: {\"message_id\":\"msg_5f20c1\",\"replaces\":\"msg_5f20c1\"}",
      "",
      "event: token",
      "data: {\"text\":\"Expenses above \"}"
    ].join("\n"),
    errors: [{ code: "404", text: "The message belongs to another user or has been deleted." }]
  },
  {
    id: "conversations-list",
    group: "Conversations",
    method: "GET",
    path: "/api/conversations",
    summary: "List your own conversations, newest first, grouped by date.",
    auth: "Session cookie",
    note: "Conversations are private. A user never sees another user's conversations, and there is no administrator view.",
    params: [
      { name: "search", in: "query", type: "string", required: false, desc: "Matches conversation title or message text." }
    ],
    request: [
      "curl -G https://assistant.northwind.example/api/conversations \\",
      "  -b cookies.txt --data-urlencode 'search=expenses'"
    ].join("\n"),
    response: [
      "200 OK",
      "",
      "{",
      "  \"groups\": [",
      "    { \"label\": \"Today\", \"conversations\": [",
      "        { \"id\": \"cnv_77a1e9\", \"title\": \"Receipt threshold for expenses\",",
      "          \"updated_at\": \"2026-10-07T09:12:40Z\" } ] },",
      "    { \"label\": \"Yesterday\", \"conversations\": [",
      "        { \"id\": \"cnv_76b033\", \"title\": \"Parental leave in the Dublin office\",",
      "          \"updated_at\": \"2026-10-06T16:48:02Z\" } ] },",
      "    { \"label\": \"Previous 30 days\", \"conversations\": [",
      "        { \"id\": \"cnv_71cc5d\", \"title\": \"Laptop refresh cycle\",",
      "          \"updated_at\": \"2026-09-23T11:07:55Z\" } ] }",
      "  ]",
      "}"
    ].join("\n"),
    errors: [{ code: "401", text: "No valid session." }]
  },
  {
    id: "conversations-get",
    group: "Conversations",
    method: "GET",
    path: "/api/conversations/{id}",
    summary: "Reopen one conversation with its full message thread and citations.",
    auth: "Session cookie",
    note: "A citation whose document has since been deleted returns document_available: false so the side panel can explain rather than error.",
    params: [
      { name: "id", in: "path", type: "string", required: true, desc: "Conversation identifier." }
    ],
    request: [
      "curl https://assistant.northwind.example/api/conversations/cnv_77a1e9 \\",
      "  -b cookies.txt"
    ].join("\n"),
    response: [
      "200 OK",
      "",
      "{",
      "  \"id\": \"cnv_77a1e9\",",
      "  \"title\": \"Receipt threshold for expenses\",",
      "  \"created_at\": \"2026-10-07T09:11:58Z\",",
      "  \"messages\": [",
      "    { \"id\": \"msg_5f20c0\", \"role\": \"user\",",
      "      \"content\": \"What is the receipt threshold for expenses?\" },",
      "    { \"id\": \"msg_5f20c1\", \"role\": \"assistant\", \"is_stopped\": false,",
      "      \"is_general_knowledge\": false,",
      "      \"content\": \"Any expense over GBP 75 needs an itemised receipt [1]…\",",
      "      \"citations\": [",
      "        { \"chip_number\": 1, \"document_id\": \"doc_41b9c2\",",
      "          \"document_available\": true,",
      "          \"excerpt\": \"Claims above GBP 75 must be accompanied…\" } ] }",
      "  ]",
      "}"
    ].join("\n"),
    errors: [{ code: "404", text: "Unknown conversation, or it belongs to another user — both answer the same way." }]
  },
  {
    id: "conversations-delete",
    group: "Conversations",
    method: "DELETE",
    path: "/api/conversations/{id}",
    summary: "Permanently delete one of your conversations and all its messages.",
    auth: "Session cookie",
    note: "If the deleted conversation is the one on screen, the client returns to the welcome screen.",
    params: [
      { name: "id", in: "path", type: "string", required: true, desc: "Conversation identifier." }
    ],
    request: [
      "curl -X DELETE \\",
      "  https://assistant.northwind.example/api/conversations/cnv_71cc5d \\",
      "  -b cookies.txt"
    ].join("\n"),
    response: ["204 No Content"].join("\n"),
    errors: [{ code: "404", text: "Already deleted, or not yours." }]
  },
  {
    id: "docs-getting-started",
    group: "Help",
    method: "GET",
    path: "/api/docs/getting-started",
    summary: "Markdown source of the in-app Getting started guide.",
    auth: "Public",
    note: "Served without a session so the documentation is readable before signing in.",
    params: [],
    request: ["curl https://assistant.northwind.example/api/docs/getting-started"].join("\n"),
    response: [
      "200 OK",
      "Content-Type: application/json",
      "",
      "{",
      "  \"title\": \"Getting started\",",
      "  \"updated_at\": \"2026-09-30T13:00:00Z\",",
      "  \"body_markdown\": \"## Asking a question\\n The assistant searches…\"",
      "}"
    ].join("\n"),
    errors: []
  },
  {
    id: "docs-api-reference",
    group: "Help",
    method: "GET",
    path: "/api/docs/api-reference",
    summary: "Machine-readable description of every endpoint on this page.",
    auth: "Public",
    note: "No key, secret or credential value is ever included in this payload — the Gemini key stays in backend/.env on the server.",
    params: [],
    request: ["curl https://assistant.northwind.example/api/docs/api-reference"].join("\n"),
    response: [
      "200 OK",
      "",
      "{",
      "  \"version\": \"v1\",",
      "  \"base_url\": \"https://assistant.northwind.example\",",
      "  \"endpoints\": [",
      "    { \"method\": \"POST\", \"path\": \"/api/auth/login\", \"auth\": \"public\" },",
      "    { \"method\": \"GET\",  \"path\": \"/api/documents\", \"auth\": \"session\" }",
      "  ]",
      "}"
    ].join("\n"),
    errors: []
  }
];

const STATUS_CODES = [
  { code: "200 / 201 / 204", meaning: "Success. 204 is returned by logout and the two delete endpoints." },
  { code: "202", meaning: "Upload accepted; ingestion continues in the background." },
  { code: "400 / 422", meaning: "Validation failed. The body names the field at fault." },
  { code: "401", meaning: "No valid session. The client redirects to the sign-in page." },
  { code: "403", meaning: "Allowed to sign in, but the action is disabled by configuration." },
  { code: "404", meaning: "Not found, or not yours — deliberately indistinguishable." },
  { code: "413 / 415", meaning: "File too large, or an unsupported file type." },
  { code: "423", meaning: "Email locked after five failed sign-ins in 15 minutes." },
  { code: "503", meaning: "The model stayed unavailable after automatic retries." }
];

export default function Screen() {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const [group, setGroup] = React.useState("All");
  const [method, setMethod] = React.useState("all");
  const [expanded, setExpanded] = React.useState(() => ["auth-login"]);
  const [copied, setCopied] = React.useState(null);

  React.useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const term = query.trim().toLowerCase();
  const results = ENDPOINTS.filter((e) => {
    if (group !== "All" && e.group !== group) return false;
    if (method !== "all" && e.method !== method) return false;
    if (!term) return true;
    return (
      e.path.toLowerCase().includes(term) ||
      e.summary.toLowerCase().includes(term) ||
      e.method.toLowerCase().includes(term) ||
      e.group.toLowerCase().includes(term)
    );
  });

  const filtersActive = term !== "" || group !== "All" || method !== "all";

  const panel = "#171C22";
  const line = "#262E38";
  const text = "#E7ECF2";
  const muted = brand.neutralColor;

  const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B9CF8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101418]";

  const methodStyle = (m) => {
    if (m === "GET") return { color: "#9CC5FF", backgroundColor: "rgba(91,156,248,0.13)", borderColor: "rgba(91,156,248,0.38)" };
    if (m === "POST") return { color: "#F4A259", backgroundColor: "rgba(244,162,89,0.13)", borderColor: "rgba(244,162,89,0.40)" };
    return { color: "#F3938A", backgroundColor: "rgba(240,138,128,0.13)", borderColor: "rgba(240,138,128,0.40)" };
  };

  const toggle = (id) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.concat(id)));

  const copy = (key, value) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value);
    } catch (err) {
      /* clipboard unavailable — confirmation still shown */
    }
    setCopied(key);
  };

  const clearAll = () => {
    setQuery("");
    setGroup("All");
    setMethod("all");
  };

  const codeBlock = (heading, headingId, code, copyKey) => (
    <div className="rounded-lg border" style={{ borderColor: line, backgroundColor: "#0D1115" }}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2" style={{ borderColor: line }}>
        <span id={headingId} className="text-xs font-medium uppercase tracking-wider" style={{ color: muted }}>
          {heading}
        </span>
        <button
          type="button"
          onClick={() => copy(copyKey, code)}
          className={"inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-white/5 " + focusRing}
          style={{ color: copied === copyKey ? brand.accentColor : muted }}
        >
          {copied === copyKey ? <Icons.Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Icons.FileText className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied === copyKey ? "Copied" : "Copy"}
          <span className="sr-only"> {heading.toLowerCase()}</span>
        </button>
      </div>
      <pre
        tabIndex={0}
        aria-labelledby={headingId}
        className={"overflow-x-auto px-4 py-3 text-[12.5px] leading-6 " + focusRing}
        style={{ color: "#CBD5E1", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );

  return (
    <div style={{ backgroundColor: brand.backgroundColor, color: text, fontFamily: brand.fontBody }} className="min-h-full">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: brand.accentColor }}>
            Knowledge Assistant · v1
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight" style={{ fontFamily: brand.fontHeading }}>
            API reference
          </h1>
          <p className="mt-3 text-[15px] leading-7" style={{ color: muted }}>
            Every HTTP endpoint behind this product: authentication, the shared knowledge base, streamed answers and your
            private conversations. These are the application&rsquo;s own endpoints — nothing here calls a model provider directly.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-sm" style={{ color: muted }}>
              Base URL
            </span>
            <code
              className="rounded px-2.5 py-1 text-[13px]"
              style={{ backgroundColor: panel, color: text, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            >
              {BASE_URL}
            </code>
            <button
              type="button"
              onClick={() => copy("base-url", BASE_URL)}
              className={"rounded px-2 py-1 text-xs font-medium hover:bg-white/5 " + focusRing}
              style={{ color: copied === "base-url" ? brand.accentColor : muted }}
            >
              {copied === "base-url" ? "Copied" : "Copy base URL"}
            </button>
          </div>
        </header>

        <div className="mt-10 h-px w-full" style={{ backgroundColor: line }} />

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <main>
            <h2 className="text-lg font-semibold tracking-tight" style={{ fontFamily: brand.fontHeading }}>
              Endpoints
            </h2>

            <div className="mt-5 flex flex-wrap items-end gap-4">
              <div className="min-w-[16rem] flex-1">
                <label htmlFor="endpoint-search" className="block text-sm font-medium" style={{ color: muted }}>
                  Search endpoints
                </label>
                <div className="relative mt-1.5">
                  <Icons.Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: muted }}
                  />
                  <input
                    id="endpoint-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="/api/documents, upload, conversations…"
                    className={"w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm placeholder:text-[#6B7683] " + focusRing}
                    style={{ backgroundColor: panel, borderColor: line, color: text, borderRadius: brand.radius }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="method-filter" className="block text-sm font-medium" style={{ color: muted }}>
                  Method
                </label>
                <select
                  id="method-filter"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className={"mt-1.5 rounded-lg border px-3 py-2.5 text-sm " + focusRing}
                  style={{ backgroundColor: panel, borderColor: line, color: text, borderRadius: brand.radius }}
                >
                  <option value="all">All methods</option>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by section">
              {GROUPS.map((g) => {
                const active = group === g;
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setGroup(g)}
                    className={"rounded-full border px-3.5 py-1.5 text-sm transition-colors " + focusRing}
                    style={{
                      borderColor: active ? "rgba(91,156,248,0.55)" : line,
                      backgroundColor: active ? "rgba(91,156,248,0.14)" : "transparent",
                      color: active ? "#AFD0FF" : muted
                    }}
                  >
                    {g}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p aria-live="polite" className="text-sm" style={{ color: muted }}>
                Showing {results.length} of {ENDPOINTS.length} endpoints
                {filtersActive ? " (filtered)" : ""}
              </p>
              <div className="flex items-center gap-2">
                {filtersActive && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className={"inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm hover:bg-white/5 " + focusRing}
                    style={{ color: muted }}
                  >
                    <Icons.X className="h-4 w-4" aria-hidden="true" />
                    Clear filters
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setExpanded(expanded.length >= results.length && results.length > 0 ? [] : results.map((r) => r.id))
                  }
                  className={"rounded px-2.5 py-1.5 text-sm hover:bg-white/5 " + focusRing}
                  style={{ color: muted }}
                >
                  {expanded.length >= results.length && results.length > 0 ? "Collapse all" : "Expand all"}
                </button>
              </div>
            </div>

            {results.length === 0 ? (
              <div
                className="mt-6 rounded-xl border px-6 py-14 text-center"
                style={{ borderColor: line, backgroundColor: panel, borderRadius: brand.radius }}
              >
                <Icons.AlertCircle className="mx-auto h-6 w-6" aria-hidden="true" style={{ color: brand.accentColor }} />
                <h3 className="mt-3 text-base font-semibold" style={{ fontFamily: brand.fontHeading }}>
                  No endpoints match
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6" style={{ color: muted }}>
                  Nothing in the reference matches &ldquo;{query.trim()}&rdquo; with the filters you have set.
                </p>
                <button
                  type="button"
                  onClick={clearAll}
                  className={"mt-5 rounded-lg px-4 py-2 text-sm font-medium text-[#0E1318] " + focusRing}
                  style={{ backgroundColor: brand.primaryColor, borderRadius: brand.radius }}
                >
                  Clear search and filters
                </button>
              </div>
            ) : (
              <ul className="mt-6 space-y-3">
                {results.map((e) => {
                  const open = expanded.includes(e.id);
                  const panelId = "panel-" + e.id;
                  const btnId = "toggle-" + e.id;
                  return (
                    <li
                      key={e.id}
                      className="overflow-hidden rounded-xl border"
                      style={{ borderColor: line, backgroundColor: panel, borderRadius: brand.radius }}
                    >
                      <h3>
                        <button
                          type="button"
                          id={btnId}
                          aria-expanded={open}
                          aria-controls={panelId}
                          onClick={() => toggle(e.id)}
                          className={"flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.03] " + focusRing}
                        >
                          <span
                            className="mt-0.5 shrink-0 rounded border px-2 py-0.5 text-[11px] font-bold tracking-wide"
                            style={{ ...methodStyle(e.method), fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                          >
                            {e.method}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className="block truncate text-[14px] font-semibold"
                              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: text }}
                            >
                              {e.path}
                            </span>
                            <span className="mt-1 block text-sm leading-6" style={{ color: muted }}>
                              {e.summary}
                            </span>
                          </span>
                          <span
                            className="hidden shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] sm:inline"
                            style={{ borderColor: line, color: muted }}
                          >
                            {e.auth}
                          </span>
                          {open ? (
                            <Icons.ChevronDown className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" style={{ color: muted }} />
                          ) : (
                            <Icons.ChevronRight className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" style={{ color: muted }} />
                          )}
                        </button>
                      </h3>

                      {open && (
                        <div id={panelId} role="region" aria-labelledby={btnId} className="border-t px-4 py-5" style={{ borderColor: line }}>
                          <p className="text-sm leading-7" style={{ color: "#C3CCD6" }}>
                            {e.note}
                          </p>

                          <h4 className="mt-6 text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>
                            Parameters
                          </h4>
                          {e.params.length === 0 ? (
                            <p className="mt-2 text-sm" style={{ color: muted }}>
                              None. The session cookie is the only input.
                            </p>
                          ) : (
                            <div className="mt-2 overflow-x-auto">
                              <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                                <caption className="sr-only">Parameters for {e.method} {e.path}</caption>
                                <thead>
                                  <tr>
                                    {["Name", "In", "Type", "Required", "Description"].map((h) => (
                                      <th
                                        key={h}
                                        scope="col"
                                        className="border-b py-2 pr-4 text-xs font-semibold uppercase tracking-wider"
                                        style={{ borderColor: line, color: muted }}
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {e.params.map((p) => (
                                    <tr key={p.name}>
                                      <th
                                        scope="row"
                                        className="border-b py-2.5 pr-4 align-top text-[13px] font-medium"
                                        style={{ borderColor: line, color: text, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                                      >
                                        {p.name}
                                      </th>
                                      <td className="border-b py-2.5 pr-4 align-top text-[13px]" style={{ borderColor: line, color: muted }}>
                                        {p.in}
                                      </td>
                                      <td className="border-b py-2.5 pr-4 align-top text-[13px]" style={{ borderColor: line, color: muted }}>
                                        {p.type}
                                      </td>
                                      <td className="border-b py-2.5 pr-4 align-top text-[13px]" style={{ borderColor: line, color: p.required ? brand.accentColor : muted }}>
                                        {p.required ? "Required" : "Optional"}
                                      </td>
                                      <td className="border-b py-2.5 align-top text-[13px] leading-6" style={{ borderColor: line, color: "#C3CCD6" }}>
                                        {p.desc}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          <div className="mt-6 grid grid-cols-1 gap-4">
                            <div>
                              <h4 className="sr-only">Example request for {e.method} {e.path}</h4>
                              {codeBlock("Example request", e.id + "-req-label", e.request, e.id + "-req")}
                            </div>
                            <div>
                              <h4 className="sr-only">Example response for {e.method} {e.path}</h4>
                              {codeBlock("Example response", e.id + "-res-label", e.response, e.id + "-res")}
                            </div>
                          </div>

                          {e.errors.length > 0 && (
                            <>
                              <h4 className="mt-6 text-xs font-semibold uppercase tracking-wider" style={{ color: muted }}>
                                Errors
                              </h4>
                              <ul className="mt-2 space-y-2">
                                {e.errors.map((err, i) => (
                                  <li key={i} className="flex gap-3 text-sm leading-6">
                                    <code
                                      className="shrink-0 rounded px-1.5 py-0.5 text-[12px]"
                                      style={{ backgroundColor: "#0D1115", color: "#F3938A", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                                    >
                                      {err.code}
                                    </code>
                                    <span style={{ color: "#C3CCD6" }}>{err.text}</span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </main>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <h2 className="text-lg font-semibold tracking-tight" style={{ fontFamily: brand.fontHeading }}>
              Conventions
            </h2>

            <div className="mt-5 space-y-4">
              <section className="rounded-xl border p-4" style={{ borderColor: line, backgroundColor: panel, borderRadius: brand.radius }}>
                <h3 className="text-sm font-semibold">Authentication</h3>
                <p className="mt-2 text-[13px] leading-6" style={{ color: muted }}>
                  Sign in once; the server sets an HTTP-only, Secure session cookie. Send it with every call
                  (<code style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>-b cookies.txt</code>). There are no API tokens and no SSO.
                </p>
              </section>

              <section className="rounded-xl border p-4" style={{ borderColor: line, backgroundColor: panel, borderRadius: brand.radius }}>
                <h3 className="text-sm font-semibold">Streaming</h3>
                <p className="mt-2 text-[13px] leading-6" style={{ color: muted }}>
                  <code style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>/api/chat</code> and{" "}
                  <code style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>/api/documents/stream</code> return{" "}
                  <code style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>text/event-stream</code>. Comment lines beginning
                  with a colon are keep-alives — ignore them rather than treating them as data.
                </p>
              </section>

              <section className="rounded-xl border p-4" style={{ borderColor: line, backgroundColor: panel, borderRadius: brand.radius }}>
                <h3 className="text-sm font-semibold">Status codes</h3>
                <dl className="mt-3 space-y-2.5">
                  {STATUS_CODES.map((s) => (
                    <div key={s.code}>
                      <dt
                        className="text-[12.5px] font-semibold"
                        style={{ color: "#9CC5FF", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                      >
                        {s.code}
                      </dt>
                      <dd className="text-[13px] leading-6" style={{ color: muted }}>
                        {s.meaning}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section
                className="rounded-xl border p-4"
                style={{ borderColor: "rgba(244,162,89,0.35)", backgroundColor: "rgba(244,162,89,0.07)", borderRadius: brand.radius }}
              >
                <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: brand.accentColor }}>
                  <Icons.AlertCircle className="h-4 w-4" aria-hidden="true" />
                  No credentials on this page
                </h3>
                <p className="mt-2 text-[13px] leading-6" style={{ color: "#D9C3AA" }}>
                  The model API key and model names live in a gitignored{" "}
                  <code style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>backend/.env</code> on the server. No endpoint
                  returns them, no example shows them, and they never appear in logs or error traces.
                </p>
              </section>

              <nav aria-label="Related pages" className="rounded-xl border p-4" style={{ borderColor: line, backgroundColor: panel, borderRadius: brand.radius }}>
                <h3 className="text-sm font-semibold">Keep reading</h3>
                <ul className="mt-3 space-y-1.5">
                  <li>
                    <button
                      type="button"
                      onClick={() => navigate("getting-started")}
                      className={"flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-white/5 " + focusRing}
                      style={{ color: "#9CC5FF" }}
                    >
                      Getting started guide
                      <Icons.ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => navigate("knowledge-base")}
                      className={"flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-white/5 " + focusRing}
                      style={{ color: "#9CC5FF" }}
                    >
                      Knowledge base
                      <Icons.ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => navigate("chat")}
                      className={"flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-white/5 " + focusRing}
                      style={{ color: "#9CC5FF" }}
                    >
                      Back to chat
                      <Icons.ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </aside>
        </div>

        <p className="mt-12 text-xs" style={{ color: muted }}>
          Reference last updated 30 September 2026 · Generated from{" "}
          <code style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>GET /api/docs/api-reference</code>
        </p>
      </div>
    </div>
  );
}
