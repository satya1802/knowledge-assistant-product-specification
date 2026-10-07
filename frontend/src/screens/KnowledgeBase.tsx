/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

const { Label, Table } = UI;
const { Plus, Search, X, FileText, Package, Clock, Trash, Download, Upload, ArrowRight, AlertCircle, CheckCircle } = Icons;

const C = {
  bg: "#101418",
  surface: "#161B21",
  surfaceAlt: "#1B222A",
  border: "#262F39",
  borderSoft: "#1F262E",
  text: "#E8EDF3",
  muted: "#8A95A1",
  primary: "#5B9CF8",
  accent: "#F4A259",
  ok: "#6FCF97",
  fail: "#F2777A",
};

const FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";

const CURRENT_USER = { name: "Satya Ganaraju", email: "satya.ganaraju@quorq.ai" };

const ALLOWED_TYPES = { pdf: "PDF", docx: "DOCX", txt: "TXT", md: "Markdown" };
const MAX_BYTES = 25 * 1024 * 1024;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const INITIAL_DOCUMENTS = [
  {
    id: "doc_8831",
    filename: "Employee-Handbook-2026.pdf",
    file_type: "pdf",
    size_bytes: 2412883,
    status: "ready",
    failure_reason: null,
    uploaded_by: "Priya Raman",
    uploaded_at: "2026-10-07T09:14:00",
    chunks: 184,
  },
  {
    id: "doc_8829",
    filename: "Benefits-Summary-2026.pdf",
    file_type: "pdf",
    size_bytes: 3902144,
    status: "processing",
    failure_reason: null,
    uploaded_by: "Dana Okoro",
    uploaded_at: "2026-10-07T10:02:00",
    outcome: "ready",
    chunks: 0,
  },
  {
    id: "doc_8830",
    filename: "Support-Escalation-Matrix.docx",
    file_type: "docx",
    size_bytes: 322570,
    status: "processing",
    failure_reason: null,
    uploaded_by: "Priya Raman",
    uploaded_at: "2026-10-07T10:21:00",
    outcome: "failed",
    outcomeReason: "Encrypted content could not be read",
    chunks: 0,
  },
  {
    id: "doc_8824",
    filename: "Q4-Sales-Playbook.docx",
    file_type: "docx",
    size_bytes: 1184220,
    status: "ready",
    failure_reason: null,
    uploaded_by: "Marcus Hale",
    uploaded_at: "2026-10-06T16:40:00",
    chunks: 96,
  },
  {
    id: "doc_8822",
    filename: "Security-Incident-Response.md",
    file_type: "md",
    size_bytes: 48102,
    status: "ready",
    failure_reason: null,
    uploaded_by: "Satya Ganaraju",
    uploaded_at: "2026-10-06T11:05:00",
    chunks: 22,
  },
  {
    id: "doc_8818",
    filename: "Travel-and-Expense-Policy.pdf",
    file_type: "pdf",
    size_bytes: 884310,
    status: "ready",
    failure_reason: null,
    uploaded_by: "Lena Fischer",
    uploaded_at: "2026-10-05T14:22:00",
    chunks: 61,
  },
  {
    id: "doc_8815",
    filename: "onboarding-checklist.txt",
    file_type: "txt",
    size_bytes: 11904,
    status: "ready",
    failure_reason: null,
    uploaded_by: "Marcus Hale",
    uploaded_at: "2026-10-05T08:58:00",
    chunks: 8,
  },
  {
    id: "doc_8811",
    filename: "Vendor-Agreement-Northwind.pdf",
    file_type: "pdf",
    size_bytes: 5201770,
    status: "failed",
    failure_reason: "Password-protected file — unlock it and upload again",
    uploaded_by: "Tomas Vieira",
    uploaded_at: "2026-10-04T17:31:00",
    chunks: 0,
  },
  {
    id: "doc_8809",
    filename: "API-Integration-Guide.md",
    file_type: "md",
    size_bytes: 97440,
    status: "ready",
    failure_reason: null,
    uploaded_by: "Satya Ganaraju",
    uploaded_at: "2026-10-04T09:12:00",
    chunks: 41,
  },
  {
    id: "doc_8803",
    filename: "Brand-Guidelines-v3.pdf",
    file_type: "pdf",
    size_bytes: 8940112,
    status: "ready",
    failure_reason: null,
    uploaded_by: "Aisha Bello",
    uploaded_at: "2026-10-03T13:47:00",
    chunks: 212,
  },
  {
    id: "doc_8799",
    filename: "Remote-Work-Policy.docx",
    file_type: "docx",
    size_bytes: 640880,
    status: "ready",
    failure_reason: null,
    uploaded_by: "Lena Fischer",
    uploaded_at: "2026-10-02T15:20:00",
    chunks: 37,
  },
  {
    id: "doc_8795",
    filename: "scanned-invoice-batch.pdf",
    file_type: "pdf",
    size_bytes: 6118420,
    status: "failed",
    failure_reason: "No extractable text found — the file appears to be a scan",
    uploaded_by: "Dana Okoro",
    uploaded_at: "2026-10-02T10:36:00",
    chunks: 0,
  },
  {
    id: "doc_8790",
    filename: "Release-Notes-2026-09.md",
    file_type: "md",
    size_bytes: 24668,
    status: "ready",
    failure_reason: null,
    uploaded_by: "Tomas Vieira",
    uploaded_at: "2026-10-01T18:04:00",
    chunks: 14,
  },
  {
    id: "doc_8784",
    filename: "Data-Retention-Standard.pdf",
    file_type: "pdf",
    size_bytes: 1550332,
    status: "ready",
    failure_reason: null,
    uploaded_by: "Aisha Bello",
    uploaded_at: "2026-09-30T12:15:00",
    chunks: 73,
  },
  {
    id: "doc_8780",
    filename: "customer-faq-draft.txt",
    file_type: "txt",
    size_bytes: 7240,
    status: "ready",
    failure_reason: null,
    uploaded_by: "Aisha Bello",
    uploaded_at: "2026-09-29T09:40:00",
    chunks: 6,
  },
];

const STATUS_META = {
  ready: { label: "Ready", color: C.ok, icon: "CheckCircle" },
  processing: { label: "Processing", color: C.accent, icon: "Clock" },
  uploading: { label: "Uploading", color: C.primary, icon: "Upload" },
  failed: { label: "Failed", color: C.fail, icon: "AlertCircle" },
};

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const StatCard = ({ label, value, tone, hint }) => (
  <div
    className="rounded-lg border px-5 py-4"
    style={{ backgroundColor: C.surface, borderColor: C.border, borderRadius: brand.radius }}
  >
    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: C.muted }}>
      {label}
    </p>
    <p className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: tone || C.text }}>
      {value}
    </p>
    <p className="mt-1 text-xs" style={{ color: C.muted }}>
      {hint}
    </p>
  </div>
);

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.ready;
  const Icon = Icons[meta.icon] || Icons.CheckCircle;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ color: meta.color, backgroundColor: "rgba(255,255,255,0.05)" }}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
};

export default function Screen() {
  const navigate = useNavigate();
  const [docs, setDocs] = React.useState(INITIAL_DOCUMENTS);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [notices, setNotices] = React.useState([]);
  const [dragging, setDragging] = React.useState(false);
  const [confirmDoc, setConfirmDoc] = React.useState(null);

  const fileInputRef = React.useRef(null);
  const dialogRef = React.useRef(null);
  const confirmBtnRef = React.useRef(null);
  const cancelBtnRef = React.useRef(null);
  const lastTriggerRef = React.useRef(null);
  const idRef = React.useRef(9000);

  // Live ingestion simulation — uploads progress, then embed, then settle.
  const hasActive = docs.some((d) => d.status === "uploading" || d.status === "processing");
  React.useEffect(() => {
    if (!hasActive) return undefined;
    const timer = setInterval(() => {
      setDocs((prev) =>
        prev.map((d) => {
          if (d.status === "uploading") {
            const next = Math.min(100, (d.progress || 0) + 34);
            return next >= 100
              ? { ...d, progress: 100, status: "processing", ticks: 0 }
              : { ...d, progress: next };
          }
          if (d.status === "processing") {
            const ticks = (d.ticks || 0) + 1;
            if (ticks < 3) return { ...d, ticks };
            if (d.outcome === "failed") {
              return {
                ...d,
                status: "failed",
                ticks,
                failure_reason: d.outcomeReason || "No extractable text found",
              };
            }
            return {
              ...d,
              status: "ready",
              ticks,
              chunks: d.chunks || Math.max(4, Math.round(d.size_bytes / 14000)),
            };
          }
          return d;
        })
      );
    }, 900);
    return () => clearInterval(timer);
  }, [hasActive]);

  // Dialog focus management
  React.useEffect(() => {
    if (confirmDoc && confirmBtnRef.current) confirmBtnRef.current.focus();
  }, [confirmDoc]);

  const pushNotice = (tone, text) => {
    idRef.current += 1;
    const id = "n_" + idRef.current;
    setNotices((prev) => [{ id, tone, text }, ...prev].slice(0, 4));
  };

  const dismissNotice = (id) => setNotices((prev) => prev.filter((n) => n.id !== id));

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const accepted = [];
    const rejected = [];
    files.forEach((file) => {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (!ALLOWED_TYPES[ext]) {
        rejected.push(
          `“${file.name}” was not uploaded. Supported types are PDF, DOCX, TXT and Markdown.`
        );
        return;
      }
      if (file.size > MAX_BYTES) {
        rejected.push(
          `“${file.name}” is ${formatSize(file.size)} and exceeds the 25 MB limit, so it was rejected before processing.`
        );
        return;
      }
      idRef.current += 1;
      accepted.push({
        id: "doc_" + idRef.current,
        filename: file.name,
        file_type: ext,
        size_bytes: file.size,
        status: "uploading",
        progress: 8,
        failure_reason: null,
        uploaded_by: CURRENT_USER.name,
        uploaded_at: new Date().toISOString(),
        outcome: "ready",
        chunks: 0,
      });
    });
    if (accepted.length) {
      setDocs((prev) => [...accepted, ...prev]);
      pushNotice(
        "success",
        `${accepted.length} file${accepted.length > 1 ? "s" : ""} added to the shared library — parsing and embedding now.`
      );
    }
    rejected.forEach((msg) => pushNotice("error", msg));
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer && event.dataTransfer.files);
  };

  const openConfirm = (doc, event) => {
    lastTriggerRef.current = event && event.currentTarget;
    setConfirmDoc(doc);
  };

  const closeConfirm = () => {
    setConfirmDoc(null);
    if (lastTriggerRef.current && lastTriggerRef.current.focus) {
      lastTriggerRef.current.focus();
    }
  };

  const performDelete = () => {
    const doc = confirmDoc;
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    pushNotice(
      "success",
      `“${doc.filename}” was permanently deleted. Its chunks and embeddings are no longer searchable.`
    );
    setConfirmDoc(null);
    if (lastTriggerRef.current && lastTriggerRef.current.focus) {
      const search = document.getElementById("doc-search");
      if (search) search.focus();
    }
  };

  const onDialogKeyDown = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeConfirm();
      return;
    }
    if (event.key === "Tab") {
      const first = cancelBtnRef.current;
      const last = confirmBtnRef.current;
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const counts = React.useMemo(() => {
    const base = { total: docs.length, ready: 0, processing: 0, failed: 0 };
    docs.forEach((d) => {
      if (d.status === "ready") base.ready += 1;
      else if (d.status === "failed") base.failed += 1;
      else base.processing += 1;
    });
    return base;
  }, [docs]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      if (q && !d.filename.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all") {
        const bucket = d.status === "uploading" ? "processing" : d.status;
        if (bucket !== statusFilter) return false;
      }
      if (typeFilter !== "all" && d.file_type !== typeFilter) return false;
      return true;
    });
  }, [docs, query, statusFilter, typeFilter]);

  const filtersActive = query.trim() !== "" || statusFilter !== "all" || typeFilter !== "all";
  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const controlStyle = {
    backgroundColor: C.surfaceAlt,
    borderColor: C.border,
    color: C.text,
    borderRadius: brand.radius,
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8" style={{ color: C.text, fontFamily: brand.fontBody }}>
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ fontFamily: brand.fontHeading }}>
            Knowledge base
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: C.muted }}>
            One shared, company-wide library. Anyone signed in can upload a document or delete any document —
            everything here can be cited in an answer.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => navigate("getting-started")}
            className={"rounded-md border px-3.5 py-2 text-sm font-medium transition-colors hover:bg-white/5 " + FOCUS}
            style={{ borderColor: C.border, color: C.text, borderRadius: brand.radius }}
          >
            Getting started
          </button>
          <button
            type="button"
            onClick={() => navigate("chat")}
            className={"inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition-opacity hover:opacity-90 " + FOCUS}
            style={{ backgroundColor: C.primary, color: "#0C1117", borderRadius: brand.radius }}
          >
            Ask a question
            <Icons.ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Stats */}
      <section className="mt-8" aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          Library statistics
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total documents" value={counts.total} hint="in the shared library" />
          <StatCard label="Ready" value={counts.ready} tone={C.ok} hint="searchable and citable" />
          <StatCard label="Processing" value={counts.processing} tone={C.accent} hint="parsing, chunking, embedding" />
          <StatCard label="Failed" value={counts.failed} tone={C.fail} hint="needs re-upload" />
        </div>
      </section>

      {/* Upload */}
      <section className="mt-8" aria-labelledby="upload-heading">
        <h2 id="upload-heading" className="text-base font-semibold">
          Add documents
        </h2>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className="mt-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors"
          style={{
            borderColor: dragging ? C.accent : C.border,
            backgroundColor: dragging ? "rgba(244,162,89,0.07)" : C.surface,
            borderRadius: brand.radius,
          }}
        >
          <Icons.Upload className="mx-auto h-7 w-7" style={{ color: C.accent }} aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">Drag files here to add them to the shared library</p>
          <p className="mt-1 text-xs" style={{ color: C.muted }}>
            PDF, DOCX, TXT and Markdown · up to 25 MB per file
          </p>

          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            className="peer sr-only"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Label
            htmlFor="file-upload"
            className={
              "mt-5 inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-900"
            }
            style={{ backgroundColor: C.primary, color: "#0C1117", borderRadius: brand.radius }}
          >
            <Icons.Plus className="h-4 w-4" aria-hidden="true" />
            Choose files
          </Label>
        </div>

        {/* Notices */}
        <div aria-live="polite" className="mt-3 space-y-2">
          {notices.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm"
              style={{
                borderColor: n.tone === "error" ? "rgba(242,119,122,0.4)" : C.border,
                backgroundColor: n.tone === "error" ? "rgba(242,119,122,0.08)" : C.surface,
                borderRadius: brand.radius,
              }}
            >
              {n.tone === "error" ? (
                <Icons.AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: C.fail }} aria-hidden="true" />
              ) : (
                <Icons.CheckCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: C.ok }} aria-hidden="true" />
              )}
              <p className="flex-1 leading-relaxed" style={{ color: C.text }}>
                <span className="sr-only">{n.tone === "error" ? "Error: " : "Success: "}</span>
                {n.text}
              </p>
              <button
                type="button"
                onClick={() => dismissNotice(n.id)}
                aria-label={"Dismiss message: " + n.text}
                className={"shrink-0 rounded p-1 hover:bg-white/10 " + FOCUS}
                style={{ color: C.muted }}
              >
                <Icons.X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Documents */}
      <section className="mt-10" aria-labelledby="documents-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="documents-heading" className="text-base font-semibold">
            Documents
          </h2>
          <p className="text-sm tabular-nums" style={{ color: C.muted }} role="status">
            Showing {filtered.length} of {docs.length} document{docs.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Label htmlFor="doc-search" className="mb-1.5 block text-xs font-medium" style={{ color: C.muted }}>
              Search by file name
            </Label>
            <div className="relative">
              <Icons.Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: C.muted }}
                aria-hidden="true"
              />
              <input
                id="doc-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. policy"
                className={"w-full rounded-md border py-2 pl-9 pr-3 text-sm placeholder:text-slate-500 " + FOCUS}
                style={controlStyle}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status-filter" className="mb-1.5 block text-xs font-medium" style={{ color: C.muted }}>
              Status
            </Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={"w-full rounded-md border px-3 py-2 text-sm " + FOCUS}
              style={controlStyle}
            >
              <option value="all">All statuses</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <Label htmlFor="type-filter" className="mb-1.5 block text-xs font-medium" style={{ color: C.muted }}>
              File type
            </Label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={"w-full rounded-md border px-3 py-2 text-sm " + FOCUS}
              style={controlStyle}
            >
              <option value="all">All types</option>
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
              <option value="txt">TXT</option>
              <option value="md">Markdown</option>
            </select>
          </div>
        </div>

        {filtersActive && (
          <div className="mt-3">
            <button
              type="button"
              onClick={clearFilters}
              className={"inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-white/5 " + FOCUS}
              style={{ borderColor: C.border, color: C.text, borderRadius: brand.radius }}
            >
              <Icons.X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear search and filters
            </button>
          </div>
        )}

        {/* Table / empty states */}
        <div
          className="mt-4 overflow-hidden rounded-xl border"
          style={{ borderColor: C.border, backgroundColor: C.surface, borderRadius: brand.radius }}
        >
          {docs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Icons.Package className="mx-auto h-8 w-8" style={{ color: C.muted }} aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold">The knowledge base is empty</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed" style={{ color: C.muted }}>
                Upload your first document and the assistant can start answering from it within seconds.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className={"mt-5 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold hover:opacity-90 " + FOCUS}
                style={{ backgroundColor: C.primary, color: "#0C1117", borderRadius: brand.radius }}
              >
                <Icons.Plus className="h-4 w-4" aria-hidden="true" />
                Upload a document
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Icons.Search className="mx-auto h-8 w-8" style={{ color: C.muted }} aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold">No matching documents</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed" style={{ color: C.muted }}>
                Nothing in the library matches {query.trim() ? `“${query.trim()}”` : "these filters"}
                {statusFilter !== "all" || typeFilter !== "all" ? " with the filters you have applied." : "."}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className={"mt-5 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-white/5 " + FOCUS}
                style={{ borderColor: C.border, color: C.text, borderRadius: brand.radius }}
              >
                <Icons.X className="h-4 w-4" aria-hidden="true" />
                Clear search and filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Shared knowledge base documents, with status, uploader, download and delete actions.
                </caption>
                <thead>
                  <tr style={{ backgroundColor: C.surfaceAlt }}>
                    <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                      Document
                    </th>
                    <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                      Type
                    </th>
                    <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                      Size
                    </th>
                    <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                      Status
                    </th>
                    <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                      Uploaded by
                    </th>
                    <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                      Uploaded
                    </th>
                    <th scope="col" className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc) => (
                    <tr key={doc.id} className="border-t align-top" style={{ borderColor: C.borderSoft }}>
                      <th scope="row" className="max-w-xs px-5 py-4 text-left font-medium">
                        <span className="flex items-start gap-2.5">
                          <Icons.FileText className="mt-0.5 h-4 w-4 shrink-0" style={{ color: C.muted }} aria-hidden="true" />
                          <span className="break-words" style={{ color: C.text }}>
                            {doc.filename}
                            {doc.uploaded_by === CURRENT_USER.name && (
                              <span className="ml-2 text-xs font-normal" style={{ color: C.muted }}>
                                · yours
                              </span>
                            )}
                          </span>
                        </span>
                      </th>
                      <td className="whitespace-nowrap px-5 py-4" style={{ color: C.muted }}>
                        {ALLOWED_TYPES[doc.file_type] || doc.file_type.toUpperCase()}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 tabular-nums" style={{ color: C.muted }}>
                        {formatSize(doc.size_bytes)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={doc.status} />
                        {doc.status === "uploading" && (
                          <div className="mt-2 w-32">
                            <div
                              role="progressbar"
                              aria-valuenow={doc.progress || 0}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={"Upload progress for " + doc.filename}
                              className="h-1.5 w-full overflow-hidden rounded-full"
                              style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                            >
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: (doc.progress || 0) + "%", backgroundColor: C.primary }}
                              />
                            </div>
                            <p className="mt-1 text-xs tabular-nums" style={{ color: C.muted }}>
                              {doc.progress || 0}% uploaded
                            </p>
                          </div>
                        )}
                        {doc.status === "processing" && (
                          <p className="mt-1.5 max-w-[14rem] text-xs leading-relaxed" style={{ color: C.muted }}>
                            Extracting text, chunking and embedding…
                          </p>
                        )}
                        {doc.status === "failed" && doc.failure_reason && (
                          <p className="mt-1.5 max-w-[14rem] text-xs leading-relaxed" style={{ color: C.fail }}>
                            {doc.failure_reason}
                          </p>
                        )}
                        {doc.status === "ready" && doc.chunks ? (
                          <p className="mt-1.5 text-xs tabular-nums" style={{ color: C.muted }}>
                            {doc.chunks} chunks indexed
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4" style={{ color: C.muted }}>
                        {doc.uploaded_by}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4" style={{ color: C.muted }}>
                        {formatDate(doc.uploaded_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={doc.status === "uploading"}
                            onClick={() =>
                              pushNotice("success", `Downloading the original “${doc.filename}”.`)
                            }
                            aria-label={"Download " + doc.filename}
                            className={
                              "rounded-md border p-2 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 " +
                              FOCUS
                            }
                            style={{ borderColor: C.border, color: C.text, borderRadius: brand.radius }}
                          >
                            <Icons.Download className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openConfirm(doc, e)}
                            aria-label={"Delete " + doc.filename}
                            className={"rounded-md border p-2 transition-colors hover:bg-white/5 " + FOCUS}
                            style={{ borderColor: C.border, color: C.fail, borderRadius: brand.radius }}
                          >
                            <Icons.Trash className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs leading-relaxed" style={{ color: C.muted }}>
          Deletion is permanent — the stored file, its chunks and its embeddings are removed, and the document stops
          being cited in new answers. There is no recycle bin.
        </p>
      </section>

      {/* Delete confirmation */}
      {confirmDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(8,11,14,0.75)" }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-desc"
            onKeyDown={onDialogKeyDown}
            className="w-full max-w-md rounded-xl border p-6 shadow-2xl"
            style={{ backgroundColor: C.surface, borderColor: C.border, borderRadius: brand.radius }}
          >
            <h2 id="delete-title" className="text-lg font-semibold" style={{ fontFamily: brand.fontHeading }}>
              Delete this document?
            </h2>
            <p id="delete-desc" className="mt-3 text-sm leading-relaxed" style={{ color: C.muted }}>
              “{confirmDoc.filename}” was uploaded by {confirmDoc.uploaded_by} on {formatDate(confirmDoc.uploaded_at)}.
              Deleting it removes the original file and every chunk and embedding derived from it, for everyone. This
              cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={closeConfirm}
                className={"rounded-md border px-4 py-2 text-sm font-medium hover:bg-white/5 " + FOCUS}
                style={{ borderColor: C.border, color: C.text, borderRadius: brand.radius }}
              >
                Cancel
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={performDelete}
                className={"inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold hover:opacity-90 " + FOCUS}
                style={{ backgroundColor: C.fail, color: "#1A0F10", borderRadius: brand.radius }}
              >
                <Icons.Trash className="h-4 w-4" aria-hidden="true" />
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
