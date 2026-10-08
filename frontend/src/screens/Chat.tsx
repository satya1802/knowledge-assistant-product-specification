import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";
import {
  downloadDocument,
  fetchConversation,
  streamChat,
  type ChatDoneData,
  type Citation,
} from "@/lib/api";

const { Label } = UI;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  is_general_knowledge?: boolean;
  is_stopped?: boolean;
  error?: boolean;
  errorMessage?: string;
  streaming?: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  messages: ChatMessage[];
}

const PALETTES = {
  dark: {
    bg: "#101418",
    rail: "#0B0E12",
    panel: "#161B21",
    raised: "#1B222A",
    border: "#252D36",
    text: "#E8EDF3",
    subtext: "#8A95A1",
    faint: "#6B7682",
    accentText: "#F4A259",
    accentBg: "rgba(244,162,89,0.12)",
    accentBorder: "rgba(244,162,89,0.45)",
    onPrimary: "#0A1220",
    overlay: "rgba(5,8,11,0.68)",
  },
  light: {
    bg: "#F6F8FC",
    rail: "#ECF1F7",
    panel: "#FFFFFF",
    raised: "#EDF2F8",
    border: "#D6DFEA",
    text: "#121920",
    subtext: "#56616E",
    faint: "#6B7682",
    accentText: "#8A4A05",
    accentBg: "rgba(244,162,89,0.18)",
    accentBorder: "rgba(138,74,5,0.45)",
    onPrimary: "#0A1220",
    overlay: "rgba(16,20,24,0.45)",
  },
};

const CURRENT_USER = {
  name: "Satya Ganaraju",
  first_name: "Satya",
  email: "satya.ganaraju@quorq.ai",
  initials: "SG",
};

const SUGGESTIONS = [
  { title: "Remote work", text: "What is our remote work policy for contractors?" },
  {
    title: "Expenses",
    text: "How much can I spend on a client dinner, and what receipts do I need?",
  },
  { title: "Security", text: "Who do I escalate a suspected security incident to?" },
  { title: "New starters", text: "What should be ready for a new starter on their first day?" },
];

function nowIso(): string {
  return new Date().toISOString();
}

export default function Screen() {
  const navigate = useNavigate();
  const {
    Plus,
    Search,
    X,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Menu,
    Package,
    FileText,
    Settings,
    Trash,
    Download,
    AlertCircle,
    CheckCircle,
    Clock,
  } = Icons;

  const [theme, setTheme] = React.useState("dark");
  const resolvedTheme = theme === "light" ? "light" : "dark";
  const t = PALETTES[resolvedTheme];

  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [chatQuery, setChatQuery] = React.useState("");
  const [input, setInput] = React.useState("");
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [streamingMsgId, setStreamingMsgId] = React.useState<string | null>(null);
  const [panel, setPanel] = React.useState<{ citation: Citation } | null>(null);
  const [toast, setToast] = React.useState("");
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);
  const [speakingId, setSpeakingId] = React.useState<string | null>(null);

  const idRef = React.useRef(500);
  const nextId = (prefix: string) => `${prefix || "m"}${idRef.current++}`;

  const endRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const searchRef = React.useRef<HTMLInputElement | null>(null);
  const cancelRef = React.useRef<HTMLButtonElement | null>(null);
  const activeStreamRef = React.useRef<{
    convId: string;
    msgId: string;
    controller: AbortController;
  } | null>(null);

  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const focusRing =
    "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const fx = (extra?: React.CSSProperties) =>
    Object.assign({ outlineColor: brand.primaryColor }, extra || {});

  const activeConv = conversations.find((c) => c.id === activeId) || null;

  /* ---------- helpers ---------- */

  const formatBytes = (b: number) =>
    b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.round(b / 1024) + " KB";

  const timeOf = (iso: string) => (iso || "").slice(11, 16);

  const dayDiff = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((b - a) / 86400000);
  };

  const groupOf = (iso: string) => {
    const n = dayDiff(iso);
    if (n <= 0) return "Today";
    if (n === 1) return "Yesterday";
    if (n <= 7) return "Previous 7 days";
    if (n <= 30) return "Previous 30 days";
    return "Older";
  };

  /* ---------- effects ---------- */

  React.useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  React.useEffect(() => {
    if (endRef.current && endRef.current.scrollIntoView)
      endRef.current.scrollIntoView({ block: "end" });
  }, [activeId, activeConv ? activeConv.messages.length : 0]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (pendingDelete) setPendingDelete(null);
      else if (menuOpen) setMenuOpen(false);
      else if (panel) setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingDelete, menuOpen, panel]);

  React.useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  React.useEffect(() => {
    if (pendingDelete && cancelRef.current) cancelRef.current.focus();
  }, [pendingDelete]);

  React.useEffect(
    () => () => {
      if (speechSupported) window.speechSynthesis.cancel();
      if (activeStreamRef.current) activeStreamRef.current.controller.abort();
    },
    [],
  );

  /* ---------- stream plumbing ---------- */

  const updateMessage = (
    convId: string,
    msgId: string,
    updater: (m: ChatMessage) => ChatMessage,
  ) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, updated_at: nowIso(), messages: c.messages.map((m) => (m.id === msgId ? updater(m) : m)) }
          : c,
      ),
    );
  };

  const finishStream = () => {
    activeStreamRef.current = null;
    setStreamingMsgId(null);
  };

  const runStream = (
    convId: string,
    msgId: string,
    question: string,
    conversationIdForRequest: string | null,
  ) => {
    const controller = new AbortController();
    activeStreamRef.current = { convId, msgId, controller };
    setStreamingMsgId(msgId);

    streamChat(
      { conversation_id: conversationIdForRequest, question },
      {
        onToken: (text) => updateMessage(convId, msgId, (m) => ({ ...m, content: m.content + text })),
        onCitations: (citations) => updateMessage(convId, msgId, (m) => ({ ...m, citations })),
        onDone: (data: ChatDoneData) => {
          const resolvedConvId = data.conversation_id || convId;
          if (resolvedConvId !== convId) {
            setConversations((prev) =>
              prev.map((c) => (c.id === convId ? { ...c, id: resolvedConvId } : c)),
            );
            setActiveId((prevActive) => (prevActive === convId ? resolvedConvId : prevActive));
          }
          updateMessage(resolvedConvId, msgId, (m) => ({
            ...m,
            streaming: false,
            is_general_knowledge: !!data.is_general_knowledge,
          }));
          finishStream();
        },
        onError: (message) => {
          updateMessage(convId, msgId, (m) => ({
            ...m,
            streaming: false,
            error: true,
            errorMessage: message,
          }));
          finishStream();
        },
      },
      controller.signal,
    ).catch(() => {
      if (controller.signal.aborted) return;
      updateMessage(convId, msgId, (m) => ({
        ...m,
        streaming: false,
        error: true,
        errorMessage: "Could not reach the server. Check your connection and try again.",
      }));
      finishStream();
    });
  };

  /* ---------- actions ---------- */

  const stopSpeech = () => {
    if (speechSupported) window.speechSynthesis.cancel();
    setSpeakingId(null);
  };

  const send = (raw: string) => {
    const text = (raw || "").trim();
    if (!text || activeStreamRef.current) return;
    stopSpeech();
    const userMsg: ChatMessage = { id: nextId("m"), role: "user", content: text, created_at: nowIso() };
    const asstId = nextId("m");
    const asstMsg: ChatMessage = {
      id: asstId,
      role: "assistant",
      content: "",
      citations: [],
      streaming: true,
      created_at: nowIso(),
    };
    let convId = activeId;
    let conversationIdForRequest: string | null = activeId;
    if (!convId) {
      convId = nextId("c");
      conversationIdForRequest = null;
      const title = text.length > 44 ? text.slice(0, 44).trim() + "…" : text;
      setConversations((prev) => [
        { id: convId as string, title, updated_at: nowIso(), messages: [userMsg, asstMsg] },
        ...prev,
      ]);
      setActiveId(convId);
    } else {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, updated_at: nowIso(), messages: [...c.messages, userMsg, asstMsg] }
            : c,
        ),
      );
    }
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    runStream(convId, asstId, text, conversationIdForRequest);
  };

  const stopStream = () => {
    const s = activeStreamRef.current;
    if (!s) return;
    s.controller.abort();
    updateMessage(s.convId, s.msgId, (m) => ({
      ...m,
      streaming: false,
      is_stopped: true,
      content: m.content || "Answer stopped before any text arrived.",
    }));
    activeStreamRef.current = null;
    setStreamingMsgId(null);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const regenerate = (convId: string, msgId: string) => {
    if (activeStreamRef.current) return;
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return;
    const idx = conv.messages.findIndex((m) => m.id === msgId);
    const question = conv.messages
      .slice(0, idx)
      .reverse()
      .find((m) => m.role === "user");
    if (!question) return;
    stopSpeech();
    updateMessage(convId, msgId, (m) => ({
      ...m,
      content: "",
      citations: [],
      is_stopped: false,
      error: false,
      errorMessage: undefined,
      is_general_knowledge: false,
      streaming: true,
    }));
    runStream(convId, msgId, question.content, convId);
  };

  const copyAnswer = (text: string) => {
    const clean = text.replace(/\[(\d+)\]/g, "");
    try {
      if (navigator && navigator.clipboard) navigator.clipboard.writeText(clean);
    } catch {
      // clipboard unavailable
    }
    setToast("Answer copied to clipboard");
  };

  const toggleSpeak = (m: ChatMessage) => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    if (speakingId === m.id) {
      setSpeakingId(null);
      return;
    }
    const u = new window.SpeechSynthesisUtterance(m.content.replace(/\[(\d+)\]/g, ""));
    u.onend = () => setSpeakingId(null);
    window.speechSynthesis.speak(u);
    setSpeakingId(m.id);
  };

  const openConversation = (id: string) => {
    stopSpeech();
    setActiveId(id);
    setPanel(null);
    if (typeof window !== "undefined" && window.innerWidth < 768) setSidebarOpen(false);
    fetchConversation(id)
      .then((conv) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, title: conv.title, updated_at: conv.updated_at, messages: conv.messages as ChatMessage[] }
              : c,
          ),
        );
      })
      .catch(() => {
        // Keep whatever we already have locally for this conversation.
      });
  };

  const newChat = () => {
    stopSpeech();
    setActiveId(null);
    setPanel(null);
    setInput("");
    if (typeof window !== "undefined" && window.innerWidth < 768) setSidebarOpen(false);
    window.setTimeout(() => {
      if (textareaRef.current) textareaRef.current.focus();
    }, 0);
  };

  const confirmDelete = () => {
    const id = pendingDelete;
    if (activeStreamRef.current && activeStreamRef.current.convId === id) {
      activeStreamRef.current.controller.abort();
      activeStreamRef.current = null;
      setStreamingMsgId(null);
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setPanel(null);
    }
    setPendingDelete(null);
    setToast("Conversation deleted");
  };

  const openSource = (citation: Citation) => {
    setPanel({ citation });
  };

  const downloadSource = (citation: Citation) => {
    const filename = citation.document_filename || citation.document_id;
    downloadDocument(citation.document_id, filename)
      .then(() => setToast("Downloading " + filename))
      .catch(() => setToast("Could not download this document."));
  };

  /* ---------- derived ---------- */

  const filtered = conversations.filter((c) => {
    const q = chatQuery.trim().toLowerCase();
    if (!q) return true;
    if (c.title.toLowerCase().includes(q)) return true;
    return c.messages.some((m) => m.content.toLowerCase().includes(q));
  });

  const ORDER = ["Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"];
  const grouped = ORDER.map((label) => ({
    label,
    items: filtered
      .filter((c) => groupOf(c.updated_at) === label)
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)),
  })).filter((g) => g.items.length > 0);

  /* ---------- renderers ---------- */

  const renderInline = (text: string, citations: Citation[] | undefined, msgId: string) => {
    const parts = text.split(/\[(\d+)\]/g);
    return parts.map((part, i) => {
      if (i % 2 === 0) return <React.Fragment key={msgId + "p" + i}>{part}</React.Fragment>;
      const num = parseInt(part, 10);
      const cit = (citations || []).find((c) => c.chip_number === num);
      if (!cit) return <React.Fragment key={msgId + "p" + i}>[{part}]</React.Fragment>;
      return (
        <button
          key={msgId + "p" + i}
          type="button"
          onClick={() => openSource(cit)}
          className={"align-super text-[0.68em] font-semibold mx-0.5 px-1 rounded " + focusRing}
          style={fx({
            backgroundColor: t.accentBg,
            color: t.accentText,
            border: "1px solid " + t.accentBorder,
          })}
        >
          <span className="sr-only">Open source </span>
          {num}
        </button>
      );
    });
  };

  const renderBody = (text: string, citations: Citation[] | undefined, msgId: string) =>
    text.split("\n\n").map((para, i) => (
      <p key={msgId + "par" + i} className="mb-3 last:mb-0 leading-7">
        {renderInline(para, citations, msgId)}
      </p>
    ));

  const actionBtn = "text-xs px-2.5 py-1.5 rounded-md transition-colors " + focusRing;

  const renderAssistant = (m: ChatMessage, conv: Conversation) => {
    const streaming = !!m.streaming;
    const citations = m.citations || [];
    return (
      <div className="flex gap-3 sm:gap-4">
        <span
          aria-hidden="true"
          className="mt-1 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold"
          style={{
            background: "linear-gradient(135deg,#5B9CF8,#9B7BF0,#F08BB4)",
            color: "#0A1220",
          }}
        >
          KA
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-medium" style={{ color: t.subtext }}>
              Knowledge Assistant
            </span>
            {m.is_stopped && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: t.raised,
                  color: t.subtext,
                  border: "1px solid " + t.border,
                }}
              >
                Stopped
              </span>
            )}
          </div>

          {m.is_general_knowledge && !streaming && !m.error && (
            <p
              className="mb-3 inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md"
              style={{ backgroundColor: t.raised, color: t.text, border: "1px solid " + t.border }}
            >
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              General knowledge · not from your documents
            </p>
          )}

          {m.error ? (
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: t.raised, border: "1px solid " + t.border }}
            >
              {m.content.trim().length > 0 && (
                <div className="text-[15px] mb-3" style={{ color: t.text }}>
                  {renderBody(m.content, citations, m.id)}
                </div>
              )}
              <p className="flex items-start gap-2 text-sm leading-6">
                <AlertCircle
                  className="h-4 w-4 mt-0.5 shrink-0"
                  aria-hidden="true"
                  style={{ color: t.accentText }}
                />
                <span>
                  {m.errorMessage || "Something went wrong while generating this answer."}
                </span>
              </p>
              <button
                type="button"
                onClick={() => regenerate(conv.id, m.id)}
                className={"mt-3 text-xs font-medium px-3 py-1.5 rounded-md " + focusRing}
                style={fx({ backgroundColor: brand.primaryColor, color: t.onPrimary })}
              >
                Retry
              </button>
            </div>
          ) : (
            <div
              className="text-[15px]"
              style={{ color: t.text }}
              aria-live={streaming ? "polite" : "off"}
              aria-busy={streaming ? "true" : "false"}
            >
              {renderBody(m.content, citations, m.id)}
              {streaming && (
                <span
                  className="inline-block h-4 w-2 align-middle animate-pulse"
                  style={{ backgroundColor: brand.primaryColor }}
                  aria-hidden="true"
                />
              )}
            </div>
          )}

          {!m.error && citations.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-medium mb-2" style={{ color: t.subtext }}>
                Sources
              </h3>
              <ol className="flex flex-wrap gap-2">
                {citations.map((c) => (
                  <li key={m.id + "c" + c.chip_number}>
                    <button
                      type="button"
                      onClick={() => openSource(c)}
                      className={
                        "inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md max-w-[16rem] " +
                        focusRing
                      }
                      style={fx({
                        backgroundColor: t.accentBg,
                        border: "1px solid " + t.accentBorder,
                        color: t.accentText,
                      })}
                    >
                      <span className="font-semibold">{c.chip_number}</span>
                      <span className="truncate">
                        {c.document_filename || "Source document"}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {!streaming && !m.error && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => copyAnswer(m.content)}
                className={actionBtn}
                style={fx({ color: t.subtext, border: "1px solid " + t.border })}
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => toggleSpeak(m)}
                disabled={!speechSupported}
                title={
                  speechSupported ? undefined : "Your browser does not support speech synthesis"
                }
                className={actionBtn + (speechSupported ? "" : " opacity-50 cursor-not-allowed")}
                style={fx({
                  color: speakingId === m.id ? t.onPrimary : t.subtext,
                  border: "1px solid " + t.border,
                  backgroundColor: speakingId === m.id ? brand.primaryColor : "transparent",
                })}
              >
                {speakingId === m.id ? "Stop reading" : "Read aloud"}
              </button>
              <button
                type="button"
                onClick={() => regenerate(conv.id, m.id)}
                disabled={!!streamingMsgId}
                className={actionBtn + (streamingMsgId ? " opacity-50 cursor-not-allowed" : "")}
                style={fx({ color: t.subtext, border: "1px solid " + t.border })}
              >
                Regenerate
              </button>
              <span className="text-[11px] ml-1" style={{ color: t.faint }}>
                {timeOf(m.created_at)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const railBtn =
    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors " + focusRing;

  /* ---------- render ---------- */

  return (
    <div
      className="flex h-full min-h-[760px] w-full relative overflow-hidden"
      style={{
        backgroundColor: t.bg,
        color: t.text,
        fontFamily: brand.fontBody,
        borderRadius: brand.radius,
      }}
    >
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 z-30"
          style={{ backgroundColor: t.overlay }}
        />
      )}

      {/* ---------------- Sidebar ---------------- */}
      <nav
        aria-label="Chat navigation"
        className={
          (sidebarOpen
            ? "fixed inset-y-0 left-0 z-40 w-[278px] md:static md:z-auto"
            : "w-[62px] shrink-0") + " flex flex-col shrink-0 border-r"
        }
        style={{ backgroundColor: t.rail, borderColor: t.border }}
      >
        <div
          className={
            "flex items-center gap-2 p-3 " + (sidebarOpen ? "justify-between" : "justify-center")
          }
        >
          {sidebarOpen && (
            <span className="text-sm font-semibold tracking-tight pl-1" style={{ color: t.text }}>
              Knowledge Assistant
            </span>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={sidebarOpen}
            className={"h-8 w-8 flex items-center justify-center rounded-lg " + focusRing}
            style={fx({ color: t.subtext, border: "1px solid " + t.border })}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className={"px-3 " + (sidebarOpen ? "" : "px-2")}>
          <button
            type="button"
            onClick={newChat}
            className={
              (sidebarOpen ? "w-full justify-start gap-2 px-3" : "w-full justify-center") +
              " flex items-center py-2 rounded-lg text-sm font-medium " +
              focusRing
            }
            style={fx({ backgroundColor: brand.primaryColor, color: t.onPrimary })}
            aria-label={sidebarOpen ? undefined : "New chat"}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {sidebarOpen && <span>New chat</span>}
          </button>
        </div>

        {sidebarOpen ? (
          <div className="px-3 pt-3">
            <Label htmlFor="chat-search" className="sr-only">
              Search chats
            </Label>
            <div className="relative">
              <Search
                className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
                style={{ color: t.faint }}
              />
              <input
                id="chat-search"
                ref={searchRef}
                type="search"
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
                placeholder="Search chats"
                className={"w-full text-sm rounded-lg pl-9 pr-3 py-2 " + focusRing}
                style={fx({
                  backgroundColor: t.panel,
                  border: "1px solid " + t.border,
                  color: t.text,
                })}
              />
            </div>
          </div>
        ) : (
          <div className="px-2 pt-3">
            <button
              type="button"
              aria-label="Search chats"
              onClick={() => {
                setSidebarOpen(true);
                window.setTimeout(() => searchRef.current && searchRef.current.focus(), 0);
              }}
              className={"w-full flex justify-center py-2 rounded-lg " + focusRing}
              style={fx({ color: t.subtext })}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <ul className="px-2 md:px-3 pt-3 space-y-0.5" aria-label="Pages">
          {[
            { label: "Knowledge base", route: "knowledge-base", Icon: Package },
            { label: "Getting started", route: "getting-started", Icon: FileText },
            { label: "API reference", route: "api-reference", Icon: Settings },
          ].map(({ label, route, Icon }) => (
            <li key={route}>
              <button
                type="button"
                onClick={() => navigate(route)}
                aria-label={sidebarOpen ? undefined : label}
                className={
                  (sidebarOpen
                    ? railBtn
                    : "w-full flex justify-center py-2 rounded-lg " + focusRing) +
                  " hover:opacity-100"
                }
                style={fx({ color: t.subtext })}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {sidebarOpen && <span className="truncate">{label}</span>}
              </button>
            </li>
          ))}
        </ul>

        {sidebarOpen && (
          <div className="flex-1 min-h-0 overflow-y-auto mt-4 px-3 pb-3">
            <div className="h-px mb-3" style={{ backgroundColor: t.border }} />
            {conversations.length === 0 ? (
              <p className="text-xs leading-5 px-1 py-2" style={{ color: t.subtext }}>
                No saved chats yet. Your conversations appear here once you ask your first
                question.
              </p>
            ) : grouped.length === 0 ? (
              <div className="px-1 py-2">
                <p className="text-xs leading-5" style={{ color: t.subtext }}>
                  No chats match “{chatQuery}”.
                </p>
                <button
                  type="button"
                  onClick={() => setChatQuery("")}
                  className={"mt-2 text-xs underline " + focusRing}
                  style={fx({ color: brand.primaryColor })}
                >
                  Clear search
                </button>
              </div>
            ) : (
              <ul className="space-y-4" aria-label="Chat history">
                {grouped.map((g) => (
                  <li key={g.label}>
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wide px-1 mb-1.5"
                      style={{ color: t.faint }}
                    >
                      {g.label}
                    </p>
                    <ul aria-label={g.label} className="space-y-0.5">
                      {g.items.map((c) => {
                        const isActive = c.id === activeId;
                        return (
                          <li key={c.id} className="group relative">
                            <button
                              type="button"
                              onClick={() => openConversation(c.id)}
                              aria-current={isActive ? "true" : undefined}
                              className={
                                "w-full text-left text-sm rounded-lg pl-3 pr-9 py-2 truncate " +
                                focusRing
                              }
                              style={fx({
                                backgroundColor: isActive ? t.raised : "transparent",
                                color: isActive ? t.text : t.subtext,
                                borderLeft: isActive
                                  ? "2px solid " + brand.primaryColor
                                  : "2px solid transparent",
                              })}
                            >
                              {c.title}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDelete(c.id)}
                              aria-label={"Delete conversation " + c.title}
                              className={
                                "absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 " +
                                focusRing
                              }
                              style={fx({ color: t.subtext })}
                            >
                              <Trash className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!sidebarOpen && <div className="flex-1" />}

        {/* Account menu */}
        <div
          className="p-2 md:p-3 border-t relative"
          style={{ borderColor: t.border }}
          ref={menuRef}
        >
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={sidebarOpen ? undefined : "Account menu"}
            className={
              (sidebarOpen
                ? "w-full flex items-center gap-2.5 px-2 py-2"
                : "w-full flex justify-center py-2") +
              " rounded-lg " +
              focusRing
            }
            style={fx({ color: t.text })}
          >
            <span
              aria-hidden="true"
              className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{ backgroundColor: t.raised, color: t.text, border: "1px solid " + t.border }}
            >
              {CURRENT_USER.initials}
            </span>
            {sidebarOpen && (
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-sm truncate">{CURRENT_USER.name}</span>
                <span className="block text-[11px] truncate" style={{ color: t.subtext }}>
                  {CURRENT_USER.email}
                </span>
              </span>
            )}
            {sidebarOpen && (
              <ChevronDown
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
                style={{ color: t.subtext }}
              />
            )}
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="Account"
              className="absolute bottom-full left-2 right-2 mb-2 rounded-xl p-2 shadow-2xl z-50"
              style={{ backgroundColor: t.panel, border: "1px solid " + t.border }}
            >
              <div className="px-2 py-2">
                <p className="text-sm font-medium truncate">{CURRENT_USER.name}</p>
                <p className="text-[11px] truncate" style={{ color: t.subtext }}>
                  {CURRENT_USER.email}
                </p>
              </div>
              <div className="h-px my-1" style={{ backgroundColor: t.border }} />
              <fieldset className="px-2 py-2">
                <legend
                  className="text-[11px] uppercase tracking-wide mb-2"
                  style={{ color: t.faint }}
                >
                  Theme
                </legend>
                <div className="flex gap-1">
                  {["Light", "Dark", "System"].map((label) => {
                    const value = label.toLowerCase();
                    const on = theme === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTheme(value)}
                        aria-pressed={on}
                        className={"flex-1 text-xs py-1.5 rounded-md " + focusRing}
                        style={fx({
                          backgroundColor: on ? brand.primaryColor : "transparent",
                          color: on ? t.onPrimary : t.subtext,
                          border: "1px solid " + (on ? brand.primaryColor : t.border),
                        })}
                      >
                        {on ? "✓ " : ""}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="h-px my-1" style={{ backgroundColor: t.border }} />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("account");
                }}
                className={"w-full text-left text-sm px-2 py-2 rounded-md " + focusRing}
                style={fx({ color: t.text })}
              >
                Change password
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  stopSpeech();
                  navigate("sign-in");
                }}
                className={"w-full text-left text-sm px-2 py-2 rounded-md " + focusRing}
                style={fx({ color: t.text })}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ---------------- Main ---------------- */}
      <main className="flex-1 min-w-0 flex flex-col">
        {activeConv ? (
          <>
            <header
              className="flex items-center justify-between gap-4 px-4 sm:px-8 py-4 border-b shrink-0"
              style={{ borderColor: t.border, backgroundColor: t.bg }}
            >
              <div className="min-w-0">
                <h1
                  className="text-base sm:text-lg font-semibold truncate"
                  style={{ fontFamily: brand.fontHeading }}
                >
                  {activeConv.title}
                </h1>
                <p
                  className="text-xs mt-0.5 flex items-center gap-1.5"
                  style={{ color: t.subtext }}
                >
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {groupOf(activeConv.updated_at)} · {timeOf(activeConv.updated_at)} · private to
                  you
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(activeConv.id)}
                className={
                  "shrink-0 inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg " +
                  focusRing
                }
                style={fx({ color: t.subtext, border: "1px solid " + t.border })}
              >
                <Trash className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Delete chat</span>
                <span className="sm:hidden sr-only">Delete chat</span>
              </button>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-8">
              <ol className="mx-auto w-full max-w-3xl space-y-8">
                {activeConv.messages.map((m) => (
                  <li key={m.id}>
                    {m.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%]">
                          <p className="text-[11px] mb-1 text-right" style={{ color: t.faint }}>
                            {CURRENT_USER.first_name} · {timeOf(m.created_at)}
                          </p>
                          <p
                            className="text-[15px] leading-7 rounded-2xl px-4 py-3"
                            style={{
                              backgroundColor: t.raised,
                              border: "1px solid " + t.border,
                              color: t.text,
                            }}
                          >
                            {m.content}
                          </p>
                        </div>
                      </div>
                    ) : (
                      renderAssistant(m, activeConv)
                    )}
                  </li>
                ))}
              </ol>
              <div ref={endRef} />
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-10 flex items-center">
            <div className="mx-auto w-full max-w-3xl">
              <h1
                className="text-3xl sm:text-[2.6rem] font-semibold tracking-tight leading-tight"
                style={{ fontFamily: brand.fontHeading }}
              >
                <span
                  style={{
                    backgroundImage: "linear-gradient(90deg,#5B9CF8,#9B7BF0,#F08BB4)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Hello, {CURRENT_USER.first_name}
                </span>
                <span style={{ color: t.subtext }}> — How can I help you today?</span>
              </h1>
              <p className="mt-4 text-sm leading-6 max-w-xl" style={{ color: t.subtext }}>
                Ask anything about the shared company knowledge base. Answers are drawn from
                uploaded documents first and cite the sources they used.
              </p>

              <h2 className="sr-only">Suggested questions</h2>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <li key={s.title}>
                    <button
                      type="button"
                      onClick={() => send(s.text)}
                      className={
                        "w-full text-left rounded-xl p-4 h-full transition-colors hover:brightness-110 " +
                        focusRing
                      }
                      style={fx({ backgroundColor: t.panel, border: "1px solid " + t.border })}
                    >
                      <span
                        className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
                        style={{ color: t.accentText }}
                      >
                        {s.title}
                      </span>
                      <span className="block text-sm leading-6" style={{ color: t.text }}>
                        {s.text}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="shrink-0 px-4 sm:px-8 pb-6 pt-3" style={{ backgroundColor: t.bg }}>
          <form
            className="mx-auto w-full max-w-3xl"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Label htmlFor="message" className="sr-only">
              Your question
            </Label>
            <div
              className="rounded-2xl p-2.5"
              style={{ backgroundColor: t.panel, border: "1px solid " + t.border }}
            >
              <textarea
                id="message"
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const el = e.target;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 200) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask about a policy, a process or a document…"
                className={
                  "w-full resize-none bg-transparent px-3 py-2 text-[15px] leading-7 max-h-[200px] " +
                  focusRing
                }
                style={fx({ color: t.text })}
              />
              <div className="flex items-center justify-between gap-3 px-1 pt-1">
                <p className="text-[11px]" style={{ color: t.faint }}>
                  Enter to send · Shift + Enter for a new line
                </p>
                {streamingMsgId ? (
                  <button
                    type="button"
                    onClick={stopStream}
                    className={
                      "inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl " +
                      focusRing
                    }
                    style={fx({
                      backgroundColor: t.raised,
                      color: t.text,
                      border: "1px solid " + t.border,
                    })}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={input.trim().length === 0}
                    className={
                      "inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl " +
                      focusRing +
                      (input.trim().length === 0 ? " opacity-45 cursor-not-allowed" : "")
                    }
                    style={fx({ backgroundColor: brand.primaryColor, color: t.onPrimary })}
                  >
                    Send
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-center" style={{ color: t.faint }}>
              The knowledge base is shared with everyone at the company. Check the cited source
              before acting on an answer.
            </p>
            <p className="sr-only" role="status">
              {streamingMsgId ? "Answer streaming" : ""}
            </p>
          </form>
        </div>
      </main>

      {/* ---------------- Source panel ---------------- */}
      {panel && (
        <aside
          aria-label="Source details"
          className="fixed inset-y-0 right-0 z-40 w-full sm:w-[23rem] lg:static lg:z-auto lg:w-[23rem] shrink-0 border-l flex flex-col"
          style={{ backgroundColor: t.panel, borderColor: t.border }}
        >
          <div
            className="flex items-start justify-between gap-3 p-4 border-b"
            style={{ borderColor: t.border }}
          >
            <h2 className="text-sm font-semibold" style={{ fontFamily: brand.fontHeading }}>
              Source {panel.citation.chip_number}
            </h2>
            <button
              type="button"
              onClick={() => setPanel(null)}
              aria-label="Close source panel"
              className={"h-8 w-8 flex items-center justify-center rounded-lg " + focusRing}
              style={fx({ color: t.subtext, border: "1px solid " + t.border })}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {!panel.citation.document_filename ? (
              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: t.raised, border: "1px solid " + t.border }}
              >
                <p className="flex items-start gap-2 text-sm leading-6">
                  <AlertCircle
                    className="h-4 w-4 mt-0.5 shrink-0"
                    aria-hidden="true"
                    style={{ color: t.accentText }}
                  />
                  <span>
                    This document's details are no longer available. It may have been deleted
                    from the shared knowledge base after this answer was generated.
                  </span>
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium break-words">
                  {panel.citation.document_filename}
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  {[
                    ["Type", panel.citation.document_file_type || "—"],
                    [
                      "Size",
                      panel.citation.document_size_bytes
                        ? formatBytes(panel.citation.document_size_bytes)
                        : "—",
                    ],
                    ["Uploaded by", panel.citation.document_uploaded_by || "—"],
                    ["Uploaded", panel.citation.document_uploaded_at || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt style={{ color: t.subtext }}>{k}</dt>
                      <dd className="text-right">{v}</dd>
                    </div>
                  ))}
                </dl>

                <h3
                  className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: t.faint }}
                >
                  Retrieved excerpt
                </h3>
                <blockquote
                  className="text-sm leading-6 rounded-lg p-3 whitespace-pre-line"
                  style={{
                    backgroundColor: t.raised,
                    borderLeft: "3px solid " + t.accentBorder,
                    color: t.text,
                  }}
                >
                  {panel.citation.excerpt}
                </blockquote>

                <div className="mt-6 space-y-2">
                  <button
                    type="button"
                    onClick={() => downloadSource(panel.citation)}
                    className={
                      "w-full inline-flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 rounded-lg " +
                      focusRing
                    }
                    style={fx({ backgroundColor: brand.primaryColor, color: t.onPrimary })}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download original
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("knowledge-base")}
                    className={
                      "w-full inline-flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg " +
                      focusRing
                    }
                    style={fx({ color: t.text, border: "1px solid " + t.border })}
                  >
                    <Package className="h-4 w-4" aria-hidden="true" />
                    Open in Knowledge base
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      )}

      {/* ---------------- Delete dialog ---------------- */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: t.overlay }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-title"
            aria-describedby="del-desc"
            className="w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: t.panel, border: "1px solid " + t.border }}
          >
            <h2
              id="del-title"
              className="text-base font-semibold"
              style={{ fontFamily: brand.fontHeading }}
            >
              Delete this conversation?
            </h2>
            <p id="del-desc" className="mt-2 text-sm leading-6" style={{ color: t.subtext }}>
              “{(conversations.find((c) => c.id === pendingDelete) || { title: "" }).title}” and
              all of its messages will be permanently removed from your history. This cannot be
              undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                ref={cancelRef}
                onClick={() => setPendingDelete(null)}
                className={"text-sm px-4 py-2 rounded-lg " + focusRing}
                style={fx({ color: t.text, border: "1px solid " + t.border })}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className={"text-sm font-medium px-4 py-2 rounded-lg " + focusRing}
                style={fx({ backgroundColor: "#E2544A", color: "#FFFFFF" })}
              >
                Delete conversation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Toast ---------------- */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg shadow-xl"
          style={{ backgroundColor: t.panel, border: "1px solid " + t.border, color: t.text }}
        >
          <CheckCircle
            className="h-4 w-4"
            aria-hidden="true"
            style={{ color: brand.primaryColor }}
          />
          {toast}
        </div>
      )}
    </div>
  );
}
