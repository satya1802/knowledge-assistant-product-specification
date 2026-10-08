import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  deleteDocument,
  downloadDocument,
  fetchDocuments,
  subscribeToDocumentStream,
  uploadDocument,
  type DocumentRecord,
} from "@/lib/api";

const { Label } = UI;

/** Palettes tuned so every status/accent colour clears 4.5:1 against its own
 * background in both themes (WCAG 2.1 AA for normal text) -- the dark
 * values are the product's existing near-black surface; the light values
 * mirror the darker, AA-safe tones already used on SignIn/Account rather
 * than the lighter brand hues, which fail contrast on a white surface. */
const PALETTES = {
  dark: {
    bg: "#101418",
    surface: "#161B21",
    surfaceAlt: "#1B222A",
    border: "#262F39",
    borderSoft: "#1F262E",
    text: "#E8EDF3",
    muted: "#8A95A1",
    primary: "#5B9CF8",
    onPrimary: "#0C1117",
    accent: "#F4A259",
    ok: "#6FCF97",
    fail: "#F2777A",
    failBg: "rgba(242,119,122,0.08)",
    failBorder: "rgba(242,119,122,0.4)",
    overlay: "rgba(8,11,14,0.75)",
  },
  light: {
    bg: "#F5F8FB",
    surface: "#FFFFFF",
    surfaceAlt: "#EEF3F8",
    border: "#D8E0E8",
    borderSoft: "#E4EAF0",
    text: "#131920",
    muted: "#4E5A66",
    primary: "#5B9CF8",
    onPrimary: "#0C1117",
    accent: "#8A5213",
    ok: "#1F7A4D",
    fail: "#B23A2C",
    failBg: "rgba(178,58,44,0.08)",
    failBorder: "rgba(178,58,44,0.4)",
    overlay: "rgba(16,20,24,0.45)",
  },
};

type Palette = typeof PALETTES.dark;

const ALLOWED_TYPES: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  txt: "TXT",
  md: "Markdown",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface UiDocument extends DocumentRecord {
  _uploading?: boolean;
  _progress?: number;
}

interface Notice {
  id: string;
  tone: "success" | "error";
  text: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StatCard({
  label,
  value,
  tone,
  hint,
  t,
}: {
  label: string;
  value: number;
  tone?: string;
  hint: string;
  t: Palette;
}) {
  return (
    <div
      className="rounded-lg border px-5 py-4"
      style={{ backgroundColor: t.surface, borderColor: t.border, borderRadius: brand.radius }}
    >
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: t.muted }}>
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums" style={{ color: tone || t.text }}>
        {value}
      </p>
      <p className="mt-1 text-xs" style={{ color: t.muted }}>
        {hint}
      </p>
    </div>
  );
}

function StatusBadge({ status, t }: { status: string; t: Palette }) {
  const meta =
    status === "ready"
      ? { label: "Ready", color: t.ok, icon: "CheckCircle" }
      : status === "failed"
        ? { label: "Failed", color: t.fail, icon: "AlertCircle" }
        : { label: "Processing", color: t.accent, icon: "Clock" };
  const Icon = Icons[meta.icon] || Icons.CheckCircle;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ color: meta.color, backgroundColor: t.surfaceAlt }}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export default function Screen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const t: Palette = resolvedTheme === "light" ? PALETTES.light : PALETTES.dark;

  const focusRing =
    "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const fx = (extra?: React.CSSProperties) =>
    Object.assign({ outlineColor: brand.primaryColor }, extra || {});

  const [documents, setDocuments] = React.useState<UiDocument[]>([]);
  const [maxUploadBytes, setMaxUploadBytes] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [notices, setNotices] = React.useState<Notice[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [confirmDoc, setConfirmDoc] = React.useState<UiDocument | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const confirmBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const cancelBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const lastTriggerRef = React.useRef<HTMLElement | null>(null);
  const idRef = React.useRef(0);

  const pushNotice = React.useCallback((tone: "success" | "error", text: string) => {
    idRef.current += 1;
    const id = "n_" + idRef.current;
    setNotices((prev) => [{ id, tone, text }, ...prev].slice(0, 4));
  }, []);

  const dismissNotice = (id: string) => setNotices((prev) => prev.filter((n) => n.id !== id));

  // Initial load from GET /api/documents.
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDocuments()
      .then((res) => {
        if (cancelled) return;
        setDocuments(res.documents);
        setMaxUploadBytes(res.max_upload_bytes);
      })
      .catch((err) => {
        if (cancelled) return;
        pushNotice(
          "error",
          err instanceof Error ? err.message : "Could not load the knowledge base.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pushNotice]);

  // Live updates from GET /api/documents/stream -- no polling, no page reload.
  React.useEffect(() => {
    const unsubscribe = subscribeToDocumentStream({
      onStatus: (doc) => {
        setDocuments((prev) => {
          const idx = prev.findIndex((d) => d.id === doc.id);
          if (idx === -1) {
            return [{ ...(doc as DocumentRecord) }, ...prev];
          }
          const next = [...prev];
          next[idx] = { ...next[idx], ...doc, _uploading: false };
          return next;
        });
      },
      onDeleted: (id) => {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      },
    });
    return unsubscribe;
  }, []);

  // Dialog focus management
  React.useEffect(() => {
    if (confirmDoc && confirmBtnRef.current) confirmBtnRef.current.focus();
  }, [confirmDoc]);

  const startUpload = React.useCallback(
    (file: File, ext: string) => {
      idRef.current += 1;
      const tempId = "temp_" + idRef.current;
      const placeholder: UiDocument = {
        id: tempId,
        filename: file.name,
        file_type: ext,
        size_bytes: file.size,
        status: "processing",
        failure_reason: null,
        uploaded_by: user?.name || "You",
        uploaded_at: new Date().toISOString(),
        chunk_count: 0,
        _uploading: true,
        _progress: 0,
      };
      setDocuments((prev) => [placeholder, ...prev]);

      uploadDocument(file, (pct) => {
        setDocuments((prev) => prev.map((d) => (d.id === tempId ? { ...d, _progress: pct } : d)));
      })
        .then((result) => {
          const accepted = result.accepted && result.accepted[0];
          const rejected = result.rejected && result.rejected[0];
          if (accepted) {
            setDocuments((prev) =>
              prev.map((d) => (d.id === tempId ? { ...accepted, _uploading: false } : d)),
            );
            pushNotice(
              "success",
              `“${file.name}” was added to the shared library — parsing and embedding now.`,
            );
          } else if (rejected) {
            setDocuments((prev) => prev.filter((d) => d.id !== tempId));
            pushNotice("error", rejected.reason || `“${file.name}” was rejected.`);
          } else {
            setDocuments((prev) =>
              prev.map((d) => (d.id === tempId ? { ...d, _uploading: false } : d)),
            );
          }
        })
        .catch((err) => {
          setDocuments((prev) => prev.filter((d) => d.id !== tempId));
          pushNotice(
            "error",
            err instanceof Error ? err.message : `“${file.name}” failed to upload.`,
          );
        });
    },
    [pushNotice, user],
  );

  const handleFiles = React.useCallback(
    (fileList: FileList | null | undefined) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;
      files.forEach((file) => {
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        if (!ALLOWED_TYPES[ext]) {
          pushNotice(
            "error",
            `“${file.name}” was not uploaded. Supported types are PDF, DOCX, TXT and Markdown.`,
          );
          return;
        }
        if (maxUploadBytes != null && file.size > maxUploadBytes) {
          pushNotice(
            "error",
            `“${file.name}” is ${formatSize(file.size)} and exceeds the ${formatSize(
              maxUploadBytes,
            )} limit, so it was rejected before processing.`,
          );
          return;
        }
        startUpload(file, ext);
      });
    },
    [maxUploadBytes, pushNotice, startUpload],
  );

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer && event.dataTransfer.files);
  };

  const openConfirm = (doc: UiDocument, event: React.MouseEvent<HTMLButtonElement>) => {
    lastTriggerRef.current = event.currentTarget;
    setConfirmDoc(doc);
  };

  const closeConfirm = () => {
    setConfirmDoc(null);
    if (lastTriggerRef.current) lastTriggerRef.current.focus();
  };

  const performDelete = async () => {
    const doc = confirmDoc;
    if (!doc) return;
    setConfirmDoc(null);
    try {
      await deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      pushNotice(
        "success",
        `“${doc.filename}” was permanently deleted. Its chunks and embeddings are no longer searchable.`,
      );
    } catch (err) {
      pushNotice(
        "error",
        err instanceof Error ? err.message : `Could not delete “${doc.filename}”. Try again.`,
      );
    }
    const search = document.getElementById("doc-search");
    if (search) search.focus();
    else if (lastTriggerRef.current) lastTriggerRef.current.focus();
  };

  const handleDownload = async (doc: UiDocument) => {
    try {
      await downloadDocument(doc.id, doc.filename);
    } catch (err) {
      pushNotice(
        "error",
        err instanceof Error ? err.message : `Could not download “${doc.filename}”. Try again.`,
      );
    }
  };

  const onDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
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
    const base = { total: documents.length, ready: 0, processing: 0, failed: 0 };
    documents.forEach((d) => {
      if (d.status === "ready") base.ready += 1;
      else if (d.status === "failed") base.failed += 1;
      else base.processing += 1;
    });
    return base;
  }, [documents]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((d) => {
      if (q && !d.filename.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (typeFilter !== "all" && d.file_type !== typeFilter) return false;
      return true;
    });
  }, [documents, query, statusFilter, typeFilter]);

  const filtersActive = query.trim() !== "" || statusFilter !== "all" || typeFilter !== "all";
  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const controlStyle = {
    backgroundColor: t.surfaceAlt,
    borderColor: t.border,
    color: t.text,
    borderRadius: brand.radius,
  };

  const sizeLimitHint =
    maxUploadBytes != null ? `up to ${formatSize(maxUploadBytes)} per file` : "";

  return (
    <div
      className="mx-auto w-full max-w-6xl overflow-x-hidden px-5 py-8 sm:px-8"
      style={{ backgroundColor: t.bg, color: t.text, fontFamily: brand.fontBody }}
    >
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ fontFamily: brand.fontHeading }}
          >
            Knowledge base
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: t.muted }}>
            One shared, company-wide library. Anyone signed in can upload a document or delete any
            document — everything here can be cited in an answer.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => navigate("getting-started")}
            className={
              "rounded-md border px-3.5 py-2 text-sm font-medium transition-colors hover:bg-black/5 " +
              focusRing
            }
            style={fx({ borderColor: t.border, color: t.text, borderRadius: brand.radius })}
          >
            Getting started
          </button>
          <button
            type="button"
            onClick={() => navigate("chat")}
            className={
              "inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition-opacity hover:opacity-90 " +
              focusRing
            }
            style={fx({ backgroundColor: t.primary, color: t.onPrimary, borderRadius: brand.radius })}
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
          <StatCard label="Total documents" value={counts.total} hint="in the shared library" t={t} />
          <StatCard
            label="Ready"
            value={counts.ready}
            tone={t.ok}
            hint="searchable and citable"
            t={t}
          />
          <StatCard
            label="Processing"
            value={counts.processing}
            tone={t.accent}
            hint="parsing, chunking, embedding"
            t={t}
          />
          <StatCard label="Failed" value={counts.failed} tone={t.fail} hint="needs re-upload" t={t} />
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
            borderColor: dragging ? t.accent : t.border,
            backgroundColor: dragging ? "rgba(244,162,89,0.07)" : t.surface,
            borderRadius: brand.radius,
          }}
        >
          <Icons.Upload
            className="mx-auto h-7 w-7"
            style={{ color: t.accent }}
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-medium">
            Drag files here to add them to the shared library
          </p>
          <p className="mt-1 text-xs" style={{ color: t.muted }}>
            PDF, DOCX, TXT and Markdown{sizeLimitHint ? ` · ${sizeLimitHint}` : ""}
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
              "mt-5 inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
            }
            style={{
              backgroundColor: t.primary,
              color: t.onPrimary,
              borderRadius: brand.radius,
              outlineColor: brand.primaryColor,
            }}
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
                borderColor: n.tone === "error" ? t.failBorder : t.border,
                backgroundColor: n.tone === "error" ? t.failBg : t.surface,
                borderRadius: brand.radius,
              }}
            >
              {n.tone === "error" ? (
                <Icons.AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: t.fail }}
                  aria-hidden="true"
                />
              ) : (
                <Icons.CheckCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: t.ok }}
                  aria-hidden="true"
                />
              )}
              <p className="flex-1 leading-relaxed" style={{ color: t.text }}>
                <span className="sr-only">{n.tone === "error" ? "Error: " : "Success: "}</span>
                {n.text}
              </p>
              <button
                type="button"
                onClick={() => dismissNotice(n.id)}
                aria-label={"Dismiss message: " + n.text}
                className={"shrink-0 rounded p-1 hover:bg-black/10 " + focusRing}
                style={fx({ color: t.muted })}
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
          <p className="text-sm tabular-nums" style={{ color: t.muted }} role="status">
            Showing {filtered.length} of {documents.length} document
            {documents.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Label
              htmlFor="doc-search"
              className="mb-1.5 block text-xs font-medium"
              style={{ color: t.muted }}
            >
              Search by file name
            </Label>
            <div className="relative">
              <Icons.Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: t.muted }}
                aria-hidden="true"
              />
              <input
                id="doc-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. policy"
                className={"w-full rounded-md border py-2 pl-9 pr-3 text-sm " + focusRing}
                style={fx(controlStyle)}
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="status-filter"
              className="mb-1.5 block text-xs font-medium"
              style={{ color: t.muted }}
            >
              Status
            </Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={"w-full rounded-md border px-3 py-2 text-sm " + focusRing}
              style={fx(controlStyle)}
            >
              <option value="all">All statuses</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <Label
              htmlFor="type-filter"
              className="mb-1.5 block text-xs font-medium"
              style={{ color: t.muted }}
            >
              File type
            </Label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={"w-full rounded-md border px-3 py-2 text-sm " + focusRing}
              style={fx(controlStyle)}
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
              className={
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-black/5 " +
                focusRing
              }
              style={fx({ borderColor: t.border, color: t.text, borderRadius: brand.radius })}
            >
              <Icons.X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear search and filters
            </button>
          </div>
        )}

        {/* Table / empty states */}
        <div
          className="mt-4 overflow-hidden rounded-xl border"
          style={{ borderColor: t.border, backgroundColor: t.surface, borderRadius: brand.radius }}
        >
          {loading ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm" style={{ color: t.muted }}>
                Loading documents…
              </p>
            </div>
          ) : documents.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Icons.Package
                className="mx-auto h-8 w-8"
                style={{ color: t.muted }}
                aria-hidden="true"
              />
              <h3 className="mt-4 text-base font-semibold">The knowledge base is empty</h3>
              <p
                className="mx-auto mt-2 max-w-md text-sm leading-relaxed"
                style={{ color: t.muted }}
              >
                Upload your first document and the assistant can start answering from it within
                seconds.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className={
                  "mt-5 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold hover:opacity-90 " +
                  focusRing
                }
                style={fx({ backgroundColor: t.primary, color: t.onPrimary, borderRadius: brand.radius })}
              >
                <Icons.Plus className="h-4 w-4" aria-hidden="true" />
                Upload a document
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Icons.Search
                className="mx-auto h-8 w-8"
                style={{ color: t.muted }}
                aria-hidden="true"
              />
              <h3 className="mt-4 text-base font-semibold">No matching documents</h3>
              <p
                className="mx-auto mt-2 max-w-md text-sm leading-relaxed"
                style={{ color: t.muted }}
              >
                Nothing in the library matches{" "}
                {query.trim() ? `“${query.trim()}”` : "these filters"}
                {statusFilter !== "all" || typeFilter !== "all"
                  ? " with the filters you have applied."
                  : "."}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className={
                  "mt-5 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-black/5 " +
                  focusRing
                }
                style={fx({ borderColor: t.border, color: t.text, borderRadius: brand.radius })}
              >
                <Icons.X className="h-4 w-4" aria-hidden="true" />
                Clear search and filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Shared knowledge base documents, with status, uploader, download and delete
                  actions.
                </caption>
                <thead>
                  <tr style={{ backgroundColor: t.surfaceAlt }}>
                    <th
                      scope="col"
                      className="px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: t.muted }}
                    >
                      Document
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: t.muted }}
                    >
                      Type
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: t.muted }}
                    >
                      Size
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: t.muted }}
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: t.muted }}
                    >
                      Uploaded by
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: t.muted }}
                    >
                      Uploaded
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                      style={{ color: t.muted }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-t align-top"
                      style={{ borderColor: t.borderSoft }}
                    >
                      <th scope="row" className="max-w-xs px-5 py-4 text-left font-medium">
                        <span className="flex items-start gap-2.5">
                          <Icons.FileText
                            className="mt-0.5 h-4 w-4 shrink-0"
                            style={{ color: t.muted }}
                            aria-hidden="true"
                          />
                          <span className="break-words" style={{ color: t.text }}>
                            {doc.filename}
                            {user && doc.uploaded_by === user.name && (
                              <span className="ml-2 text-xs font-normal" style={{ color: t.muted }}>
                                · yours
                              </span>
                            )}
                          </span>
                        </span>
                      </th>
                      <td className="whitespace-nowrap px-5 py-4" style={{ color: t.muted }}>
                        {ALLOWED_TYPES[doc.file_type] || doc.file_type.toUpperCase()}
                      </td>
                      <td
                        className="whitespace-nowrap px-5 py-4 tabular-nums"
                        style={{ color: t.muted }}
                      >
                        {formatSize(doc.size_bytes)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={doc.status} t={t} />
                        {doc._uploading && (
                          <div className="mt-2 w-32">
                            <div
                              role="progressbar"
                              aria-valuenow={doc._progress || 0}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={"Upload progress for " + doc.filename}
                              className="h-1.5 w-full overflow-hidden rounded-full"
                              style={{ backgroundColor: t.surfaceAlt }}
                            >
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: (doc._progress || 0) + "%",
                                  backgroundColor: t.primary,
                                }}
                              />
                            </div>
                            <p className="mt-1 text-xs tabular-nums" style={{ color: t.muted }}>
                              {doc._progress || 0}% uploaded
                            </p>
                          </div>
                        )}
                        {!doc._uploading && doc.status === "processing" && (
                          <p
                            className="mt-1.5 max-w-[14rem] text-xs leading-relaxed"
                            style={{ color: t.muted }}
                          >
                            Extracting text, chunking and embedding…
                          </p>
                        )}
                        {doc.status === "failed" && doc.failure_reason && (
                          <p
                            className="mt-1.5 max-w-[14rem] text-xs leading-relaxed"
                            style={{ color: t.fail }}
                          >
                            {doc.failure_reason}
                          </p>
                        )}
                        {doc.status === "ready" && doc.chunk_count ? (
                          <p className="mt-1.5 text-xs tabular-nums" style={{ color: t.muted }}>
                            {doc.chunk_count} chunks indexed
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4" style={{ color: t.muted }}>
                        {doc.uploaded_by}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4" style={{ color: t.muted }}>
                        {formatDate(doc.uploaded_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={doc._uploading}
                            onClick={() => handleDownload(doc)}
                            aria-label={"Download " + doc.filename}
                            className={
                              "rounded-md border p-2 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 " +
                              focusRing
                            }
                            style={fx({
                              borderColor: t.border,
                              color: t.text,
                              borderRadius: brand.radius,
                            })}
                          >
                            <Icons.Download className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={doc._uploading}
                            onClick={(e) => openConfirm(doc, e)}
                            aria-label={"Delete " + doc.filename}
                            className={
                              "rounded-md border p-2 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 " +
                              focusRing
                            }
                            style={fx({
                              borderColor: t.border,
                              color: t.fail,
                              borderRadius: brand.radius,
                            })}
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

        <p className="mt-3 text-xs leading-relaxed" style={{ color: t.muted }}>
          Deletion is permanent — the stored file, its chunks and its embeddings are removed, and
          the document stops being cited in new answers. There is no recycle bin.
        </p>
      </section>

      {/* Delete confirmation */}
      {confirmDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: t.overlay }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-desc"
            onKeyDown={onDialogKeyDown}
            className="w-full max-w-md rounded-xl border p-6 shadow-2xl"
            style={{
              backgroundColor: t.surface,
              borderColor: t.border,
              borderRadius: brand.radius,
            }}
          >
            <h2
              id="delete-title"
              className="text-lg font-semibold"
              style={{ fontFamily: brand.fontHeading }}
            >
              Delete this document?
            </h2>
            <p id="delete-desc" className="mt-3 text-sm leading-relaxed" style={{ color: t.muted }}>
              “{confirmDoc.filename}” was uploaded by {confirmDoc.uploaded_by} on{" "}
              {formatDate(confirmDoc.uploaded_at)}. Deleting it removes the original file and every
              chunk and embedding derived from it, for everyone. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={closeConfirm}
                className={
                  "rounded-md border px-4 py-2 text-sm font-medium hover:bg-black/5 " + focusRing
                }
                style={fx({ borderColor: t.border, color: t.text, borderRadius: brand.radius })}
              >
                Cancel
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={performDelete}
                className={
                  "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold hover:opacity-90 " +
                  focusRing
                }
                style={fx({ backgroundColor: "#C43F36", color: "#FFFFFF", borderRadius: brand.radius })}
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
