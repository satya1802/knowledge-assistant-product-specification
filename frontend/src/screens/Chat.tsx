// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

const { Label } = UI;
const { Plus, Search, Check, X, ChevronRight, ChevronDown, ChevronLeft, Menu, Settings, FileText, Package, Clock, Trash, Download, AlertCircle, CheckCircle } = Icons;

const PALETTES = {
  dark: {
    bg: '#101418',
    rail: '#0B0E12',
    panel: '#161B21',
    raised: '#1B222A',
    border: '#252D36',
    text: '#E8EDF3',
    subtext: '#8A95A1',
    faint: '#6B7682',
    accentText: '#F4A259',
    accentBg: 'rgba(244,162,89,0.12)',
    accentBorder: 'rgba(244,162,89,0.45)',
    onPrimary: '#0A1220',
    overlay: 'rgba(5,8,11,0.68)'
  },
  light: {
    bg: '#F6F8FC',
    rail: '#ECF1F7',
    panel: '#FFFFFF',
    raised: '#EDF2F8',
    border: '#D6DFEA',
    text: '#121920',
    subtext: '#56616E',
    faint: '#6B7682',
    accentText: '#8A4A05',
    accentBg: 'rgba(244,162,89,0.18)',
    accentBorder: 'rgba(138,74,5,0.45)',
    onPrimary: '#0A1220',
    overlay: 'rgba(16,20,24,0.45)'
  }
};

const CURRENT_USER = {
  name: 'Satya Ganaraju',
  first_name: 'Satya',
  email: 'satya.ganaraju@quorq.ai',
  initials: 'SG'
};

const TODAY = { y: 2026, m: 9, d: 7 }; // 7 Oct 2026
const NOW_ISO = '2026-10-07T10:31:00';

const DOCS = {
  d1: { id: 'd1', filename: 'Remote-Work-Policy-2026.pdf', file_type: 'PDF', size_bytes: 418221, uploaded_by: 'Priya Raman', uploaded_at: '14 Sep 2026' },
  d2: { id: 'd2', filename: 'Employee-Handbook-v4.docx', file_type: 'DOCX', size_bytes: 1204880, uploaded_by: 'Marcus Webb', uploaded_at: '30 Aug 2026' },
  d3: { id: 'd3', filename: 'Expense-Reimbursement-Guide.md', file_type: 'MD', size_bytes: 28440, uploaded_by: 'Dana Okonkwo', uploaded_at: '28 Sep 2026' },
  d4: { id: 'd4', filename: 'Security-Incident-Runbook.pdf', file_type: 'PDF', size_bytes: 692013, uploaded_by: 'Tomas Lindqvist', uploaded_at: '19 Jul 2026' },
  d5: { id: 'd5', filename: 'Onboarding-Checklist.txt', file_type: 'TXT', size_bytes: 9112, uploaded_by: 'Priya Raman', uploaded_at: '01 Oct 2026' },
  d6: { id: 'd6', filename: 'Benefits-Summary-2026.pdf', file_type: 'PDF', size_bytes: 355900, uploaded_by: 'Hannah Cole', uploaded_at: '11 Jun 2026' }
};

const ANSWER_LIBRARY = [
  {
    keys: ['remote', 'home', 'hybrid', 'contractor'],
    content:
      'Contractors fall under the same remote-work rules as permanent staff, with two differences worth knowing.\n\nAnyone may work remotely up to three days a week by default, and the arrangement is agreed directly with your line manager rather than raised as an HR request [1]. Contractors engaged for less than six months are not eligible for the home-office equipment allowance; their equipment is issued and returned through the hiring team instead [2].\n\nFully remote arrangements still need written approval from a department head and are reviewed every six months [1].',
    citations: [
      { chip_number: 1, document_id: 'd1', excerpt: 'All staff, including fixed-term and contract personnel, may work remotely for up to three (3) days per working week. Arrangements are agreed with the line manager. Fully remote arrangements require written approval from the department head and are reviewed at six-month intervals.' },
      { chip_number: 2, document_id: 'd2', excerpt: '§7.4 Equipment allowance. The £450 home-office allowance is available to employees and to contractors engaged for six months or longer. Shorter engagements are equipped by the hiring team, and equipment is returned at the end of the engagement.' }
    ]
  },
  {
    keys: ['expense', 'dinner', 'receipt', 'reimburse', 'spend', 'claim'],
    content:
      'Client dinners are capped at £60 per head including service, and anything above that needs prior approval from a budget holder [1].\n\nYou need an itemised receipt for any single claim over £25 — card statements are not accepted on their own. Claims are submitted within 30 days of the spend and are paid with the following month\'s payroll run [1]. Alcohol is reimbursable with a meal but not on its own [2].',
    citations: [
      { chip_number: 1, document_id: 'd3', excerpt: '## Client entertainment\\nLimit: £60 per head, inclusive of service. Above-limit spend requires written approval from a budget holder before the event. Itemised receipts are mandatory for any single line over £25. Submit within 30 days; reimbursement follows the next payroll run.' },
      { chip_number: 2, document_id: 'd2', excerpt: '§11.2 Alcohol purchased as part of a client meal is reimbursable within the per-head limit. Standalone bar spend is not reimbursable.' }
    ]
  },
  {
    keys: ['incident', 'security', 'breach', 'escalate', 'severity', 'phishing'],
    content:
      'Raise it immediately in #security-incidents and page the on-call security engineer — do not wait to confirm it is real [1].\n\nSeverity 1 (customer data exposure, or any production system compromised) goes straight to the Head of Security and the duty executive within 15 minutes. Severity 2 and 3 are triaged by the on-call engineer within one hour during working hours [1]. Keep the affected machine powered on and connected; disconnecting it destroys evidence the forensics step needs [1].',
    citations: [
      { chip_number: 1, document_id: 'd4', excerpt: 'Step 1 — Report. Post in #security-incidents and page the on-call security engineer via the rota. Do not pre-verify. Sev-1 (customer data exposure or production compromise) escalates to the Head of Security and the duty executive within 15 minutes. Preserve state: do not power down or disconnect affected hosts.' }
    ]
  },
  {
    keys: ['onboard', 'starter', 'first day', 'laptop', 'induction', 'new hire'],
    content:
      'A new starter should arrive to a laptop already enrolled in device management, an account created the working day before, and a named buddy for their first two weeks [1].\n\nDay one covers the handbook acknowledgement, the security awareness module and a 30-minute session with their manager to agree the first 30-day goals [1]. Payroll and benefits enrolment must be completed by the end of the first week [2].',
    citations: [
      { chip_number: 1, document_id: 'd5', excerpt: '[ ] Laptop imaged and enrolled in MDM (T-1 day)\\n[ ] Account created and group membership applied (T-1 day)\\n[ ] Buddy assigned for weeks 1-2\\n[ ] Handbook acknowledgement + security awareness module (day 1)\\n[ ] 30-day goals agreed with manager (day 1)' },
      { chip_number: 2, document_id: 'd2', excerpt: '§3.1 Payroll and benefits enrolment is completed within the first five working days. Late enrolment delays first-month salary processing.' }
    ]
  },
  {
    keys: ['leave', 'holiday', 'parental', 'benefit', 'pension', 'sick'],
    content:
      'The standard entitlement is 25 days plus public holidays, rising by one day per completed year of service to a maximum of 30 [1].\n\nUp to five unused days carry into the next year and must be taken by 31 March. Parental leave is 26 weeks at full pay for the primary carer and 6 weeks at full pay for the secondary carer, available from the first day of employment [1]. Sickness absence beyond three consecutive days needs a fit note [2].',
    citations: [
      { chip_number: 1, document_id: 'd6', excerpt: 'Annual leave: 25 days + public holidays, +1 day per completed year to a cap of 30. Carry-over: maximum 5 days, to be used by 31 March. Parental leave: primary carer 26 weeks full pay; secondary carer 6 weeks full pay; no qualifying period.' },
      { chip_number: 2, document_id: 'd2', excerpt: '§9.6 Absence of more than three consecutive working days requires a fit note submitted to your manager.' }
    ]
  }
];

const GENERAL_ANSWER = {
  content:
    'I could not find anything in the shared knowledge base that answers this, so this comes from the model\'s general knowledge rather than your documents.\n\nIn broad terms, retrieval-augmented systems answer best when the question names a concrete thing — a policy, a process, a document title. If you expected this to be covered, it may be that the document has not been uploaded yet, or that it is still processing on the Knowledge base page.',
  citations: [],
  is_general_knowledge: true
};

const SUGGESTIONS = [
  { title: 'Remote work', text: 'What is our remote work policy for contractors?' },
  { title: 'Expenses', text: 'How much can I spend on a client dinner, and what receipts do I need?' },
  { title: 'Security', text: 'Who do I escalate a suspected security incident to?' },
  { title: 'New starters', text: 'What should be ready for a new starter on their first day?' }
];

const INITIAL_CONVERSATIONS = [
  {
    id: 'c1',
    title: 'Remote work policy for contractors',
    updated_at: '2026-10-07T09:12:00',
    messages: [
      { id: 'm1', role: 'user', content: 'What is our remote work policy for contractors?', created_at: '2026-10-07T09:12:00' },
      {
        id: 'm2',
        role: 'assistant',
        created_at: '2026-10-07T09:12:00',
        content: ANSWER_LIBRARY[0].content,
        citations: ANSWER_LIBRARY[0].citations
      }
    ]
  },
  {
    id: 'c2',
    title: 'Expense limit for client dinners',
    updated_at: '2026-10-07T08:41:00',
    messages: [
      { id: 'm3', role: 'user', content: 'How much can I spend on a client dinner?', created_at: '2026-10-07T08:38:00' },
      { id: 'm4', role: 'assistant', created_at: '2026-10-07T08:38:00', content: ANSWER_LIBRARY[1].content, citations: ANSWER_LIBRARY[1].citations },
      { id: 'm5', role: 'user', content: 'And what about last year?', created_at: '2026-10-07T08:41:00' },
      {
        id: 'm6',
        role: 'assistant',
        created_at: '2026-10-07T08:41:00',
        content:
          'For 2025 the per-head limit on client dinners was the same £60, but the receipt rule was looser: itemised receipts were only required above £50, and claims could be submitted up to 60 days after the spend [1].\n\nThe tightening to £25 and 30 days took effect on 1 January 2026.',
        citations: [
          { chip_number: 1, document_id: 'd3', excerpt: '### Change log\\n2026-01-01 — Itemised receipt threshold reduced from £50 to £25. Submission window reduced from 60 to 30 days. Per-head entertainment limit unchanged at £60.' }
        ]
      }
    ]
  },
  {
    id: 'c3',
    title: 'Security incident escalation path',
    updated_at: '2026-10-06T16:28:00',
    messages: [
      { id: 'm7', role: 'user', content: 'Who do I escalate a suspected phishing email to, and how fast?', created_at: '2026-10-06T16:28:00' },
      { id: 'm8', role: 'assistant', created_at: '2026-10-06T16:28:00', content: ANSWER_LIBRARY[2].content, citations: ANSWER_LIBRARY[2].citations }
    ]
  },
  {
    id: 'c4',
    title: 'Parental leave entitlement',
    updated_at: '2026-10-06T11:05:00',
    messages: [
      { id: 'm9', role: 'user', content: 'How much parental leave do secondary carers get?', created_at: '2026-10-06T11:05:00' },
      {
        id: 'm10',
        role: 'assistant',
        created_at: '2026-10-06T11:05:00',
        is_stopped: true,
        content: 'Secondary carers are entitled to 6 weeks at full pay, available from the first day of employment with no qualifying',
        citations: []
      }
    ]
  },
  {
    id: 'c5',
    title: 'What changed in Handbook v4',
    updated_at: '2026-10-02T14:20:00',
    messages: [
      { id: 'm11', role: 'user', content: 'Summarise what changed between handbook v3 and v4.', created_at: '2026-10-02T14:20:00' },
      {
        id: 'm12',
        role: 'assistant',
        created_at: '2026-10-02T14:20:00',
        content:
          'Four substantive changes were made in version 4.\n\nThe equipment allowance was extended to contractors on engagements of six months or more, the sickness fit-note threshold moved from five days to three, and the expenses chapter was replaced by a reference to the standalone reimbursement guide [1]. The old travel-booking appendix was removed entirely [2].',
        citations: [
          { chip_number: 1, document_id: 'd2', excerpt: '§0.2 Summary of changes in v4: equipment allowance extended to contractors (6m+); fit-note threshold reduced to 3 consecutive days; expenses chapter superseded by the Expense Reimbursement Guide.' },
          { chip_number: 2, document_id: 'd-archived', excerpt: 'Appendix C — Travel booking procedure (withdrawn).' }
        ]
      }
    ]
  },
  {
    id: 'c6',
    title: 'Which embedding model do we use',
    updated_at: '2026-09-29T10:02:00',
    messages: [
      { id: 'm13', role: 'user', content: 'Which embedding model does the assistant use for search?', created_at: '2026-09-29T10:02:00' },
      {
        id: 'm14',
        role: 'assistant',
        created_at: '2026-09-29T10:02:00',
        is_general_knowledge: true,
        content:
          'Nothing in the knowledge base covers this, so here is a general answer.\n\nThe embedding model is set by the operator in the backend configuration and is not exposed in the interface. Your administrator can confirm which model name is configured; the assistant will never print the key or the configuration file contents.',
        citations: []
      }
    ]
  },
  {
    id: 'c7',
    title: 'VPN setup for new starters',
    updated_at: '2026-09-21T09:47:00',
    messages: [
      { id: 'm15', role: 'user', content: 'Walk me through VPN setup for a new starter on macOS.', created_at: '2026-09-21T09:47:00' },
      {
        id: 'm16',
        role: 'assistant',
        created_at: '2026-09-21T09:47:00',
        error: true,
        content: 'The assistant was busy and did not respond after three attempts. Nothing was saved to this conversation.',
        citations: []
      }
    ]
  }
];

export default function Screen() {
  const navigate = useNavigate();
  const { Plus, Search, X, ChevronLeft, ChevronRight, ChevronDown, Menu, Package, FileText, Settings, Trash, Download, AlertCircle, CheckCircle, Clock } = Icons;

  const [theme, setTheme] = React.useState('dark');
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';
  const t = PALETTES[resolvedTheme];

  const [conversations, setConversations] = React.useState(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = React.useState('c1');
  const [chatQuery, setChatQuery] = React.useState('');
  const [input, setInput] = React.useState('');
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [stream, setStream] = React.useState(null);
  const [panel, setPanel] = React.useState(null);
  const [toast, setToast] = React.useState('');
  const [pendingDelete, setPendingDelete] = React.useState(null);
  const [speakingId, setSpeakingId] = React.useState(null);

  const idRef = React.useRef(500);
  const nextId = (prefix) => `${prefix || 'm'}${idRef.current++}`;

  const endRef = React.useRef(null);
  const textareaRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const searchRef = React.useRef(null);
  const cancelRef = React.useRef(null);

  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const focusRing = 'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
  const fx = (extra) => Object.assign({ outlineColor: brand.primaryColor }, extra || {});

  const activeConv = conversations.find((c) => c.id === activeId) || null;

  /* ---------- helpers ---------- */

  const formatBytes = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB');

  const timeOf = (iso) => (iso || '').slice(11, 16);

  const dayDiff = (iso) => {
    const d = new Date(iso);
    const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    const b = Date.UTC(TODAY.y, TODAY.m, TODAY.d);
    return Math.round((b - a) / 86400000);
  };

  const groupOf = (iso) => {
    const n = dayDiff(iso);
    if (n <= 0) return 'Today';
    if (n === 1) return 'Yesterday';
    if (n <= 7) return 'Previous 7 days';
    if (n <= 30) return 'Previous 30 days';
    return 'Older';
  };

  const tokenize = (s) => s.split(/(\s+)/);

  const composeAnswer = (question) => {
    const q = question.toLowerCase();
    const hit = ANSWER_LIBRARY.find((a) => a.keys.some((k) => q.includes(k)));
    if (hit) return { content: hit.content, citations: hit.citations, is_general_knowledge: false };
    return GENERAL_ANSWER;
  };

  /* ---------- streaming ---------- */

  React.useEffect(() => {
    if (!stream) return undefined;
    if (stream.i >= stream.tokens.length) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === stream.convId
            ? {
                ...c,
                updated_at: NOW_ISO,
                messages: c.messages.map((m) =>
                  m.id === stream.msgId
                    ? { ...m, content: stream.tokens.join(''), citations: stream.citations, is_general_knowledge: stream.gk, streaming: false }
                    : m
                )
              }
            : c
        )
      );
      setStream(null);
      return undefined;
    }
    const id = setTimeout(() => setStream((s) => (s ? { ...s, i: Math.min(s.i + 2, s.tokens.length) } : s)), 28);
    return () => clearTimeout(id);
  }, [stream]);

  React.useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  React.useEffect(() => {
    if (endRef.current && endRef.current.scrollIntoView) endRef.current.scrollIntoView({ block: 'end' });
  }, [activeId, activeConv ? activeConv.messages.length : 0]);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (pendingDelete) setPendingDelete(null);
      else if (menuOpen) setMenuOpen(false);
      else if (panel) setPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingDelete, menuOpen, panel]);

  React.useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  React.useEffect(() => {
    if (pendingDelete && cancelRef.current) cancelRef.current.focus();
  }, [pendingDelete]);

  React.useEffect(() => () => { if (speechSupported) window.speechSynthesis.cancel(); }, []);

  /* ---------- actions ---------- */

  const stopSpeech = () => {
    if (speechSupported) window.speechSynthesis.cancel();
    setSpeakingId(null);
  };

  const send = (raw) => {
    const text = (raw || '').trim();
    if (!text || stream) return;
    stopSpeech();
    const ans = composeAnswer(text);
    const userMsg = { id: nextId('m'), role: 'user', content: text, created_at: NOW_ISO };
    const asstId = nextId('m');
    const asstMsg = { id: asstId, role: 'assistant', content: '', citations: [], streaming: true, created_at: NOW_ISO };
    let convId = activeId;
    if (!convId) {
      convId = nextId('c');
      const title = text.length > 44 ? text.slice(0, 44).trim() + '…' : text;
      setConversations((prev) => [{ id: convId, title, updated_at: NOW_ISO, messages: [userMsg, asstMsg] }, ...prev]);
      setActiveId(convId);
    } else {
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, updated_at: NOW_ISO, messages: [...c.messages, userMsg, asstMsg] } : c))
      );
    }
    setStream({ convId, msgId: asstId, tokens: tokenize(ans.content), i: 0, citations: ans.citations, gk: !!ans.is_general_knowledge });
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const stopStream = () => {
    if (!stream) return;
    const partial = stream.tokens.slice(0, stream.i).join('').trimEnd();
    setConversations((prev) =>
      prev.map((c) =>
        c.id === stream.convId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === stream.msgId ? { ...m, content: partial || 'Answer stopped before any text arrived.', is_stopped: true, streaming: false } : m
              )
            }
          : c
      )
    );
    setStream(null);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const regenerate = (convId, msgId) => {
    if (stream) return;
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return;
    const idx = conv.messages.findIndex((m) => m.id === msgId);
    const question = conv.messages.slice(0, idx).reverse().find((m) => m.role === 'user');
    if (!question) return;
    stopSpeech();
    const ans = composeAnswer(question.content);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId
                  ? { ...m, content: '', citations: [], is_stopped: false, error: false, is_general_knowledge: false, streaming: true }
                  : m
              )
            }
          : c
      )
    );
    setStream({ convId, msgId, tokens: tokenize(ans.content), i: 0, citations: ans.citations, gk: !!ans.is_general_knowledge });
  };

  const copyAnswer = (text) => {
    const clean = text.replace(/\[(\d+)\]/g, '');
    try {
      if (navigator && navigator.clipboard) navigator.clipboard.writeText(clean);
    } catch (e) { /* clipboard unavailable */ }
    setToast('Answer copied to clipboard');
  };

  const toggleSpeak = (m) => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    if (speakingId === m.id) { setSpeakingId(null); return; }
    const u = new window.SpeechSynthesisUtterance(m.content.replace(/\[(\d+)\]/g, ''));
    u.onend = () => setSpeakingId(null);
    window.speechSynthesis.speak(u);
    setSpeakingId(m.id);
  };

  const openConversation = (id) => {
    stopSpeech();
    setActiveId(id);
    setPanel(null);
    if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen(false);
  };

  const newChat = () => {
    stopSpeech();
    setActiveId(null);
    setPanel(null);
    setInput('');
    if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen(false);
    window.setTimeout(() => { if (textareaRef.current) textareaRef.current.focus(); }, 0);
  };

  const confirmDelete = () => {
    const id = pendingDelete;
    if (stream && stream.convId === id) setStream(null);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) { setActiveId(null); setPanel(null); }
    setPendingDelete(null);
    setToast('Conversation deleted');
  };

  const openSource = (citation) => {
    setPanel({ citation, doc: DOCS[citation.document_id] || null });
  };

  /* ---------- derived ---------- */

  const filtered = conversations.filter((c) => {
    const q = chatQuery.trim().toLowerCase();
    if (!q) return true;
    if (c.title.toLowerCase().includes(q)) return true;
    return c.messages.some((m) => m.content.toLowerCase().includes(q));
  });

  const ORDER = ['Today', 'Yesterday', 'Previous 7 days', 'Previous 30 days', 'Older'];
  const grouped = ORDER.map((label) => ({
    label,
    items: filtered
      .filter((c) => groupOf(c.updated_at) === label)
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
  })).filter((g) => g.items.length > 0);

  /* ---------- renderers ---------- */

  const renderInline = (text, citations, msgId) => {
    const parts = text.split(/\[(\d+)\]/g);
    return parts.map((part, i) => {
      if (i % 2 === 0) return <React.Fragment key={msgId + 'p' + i}>{part}</React.Fragment>;
      const num = parseInt(part, 10);
      const cit = (citations || []).find((c) => c.chip_number === num);
      if (!cit) return <React.Fragment key={msgId + 'p' + i}>[{part}]</React.Fragment>;
      return (
        <button
          key={msgId + 'p' + i}
          type="button"
          onClick={() => openSource(cit)}
          className={'align-super text-[0.68em] font-semibold mx-0.5 px-1 rounded ' + focusRing}
          style={fx({ backgroundColor: t.accentBg, color: t.accentText, border: '1px solid ' + t.accentBorder })}
        >
          <span className="sr-only">Open source </span>{num}
        </button>
      );
    });
  };

  const renderBody = (text, citations, msgId) =>
    text.split('\n\n').map((para, i) => (
      <p key={msgId + 'par' + i} className="mb-3 last:mb-0 leading-7">
        {renderInline(para, citations, msgId)}
      </p>
    ));

  const actionBtn = 'text-xs px-2.5 py-1.5 rounded-md transition-colors ' + focusRing;

  const renderAssistant = (m, conv) => {
    const streaming = !!(stream && stream.msgId === m.id);
    const body = streaming ? stream.tokens.slice(0, stream.i).join('') : m.content;
    const citations = streaming ? [] : m.citations || [];
    return (
      <div className="flex gap-3 sm:gap-4">
        <span
          aria-hidden="true"
          className="mt-1 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold"
          style={{ background: 'linear-gradient(135deg,#5B9CF8,#9B7BF0,#F08BB4)', color: '#0A1220' }}
        >
          KA
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-medium" style={{ color: t.subtext }}>Knowledge Assistant</span>
            {m.is_stopped && (
              <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ backgroundColor: t.raised, color: t.subtext, border: '1px solid ' + t.border }}>
                Stopped
              </span>
            )}
          </div>

          {m.is_general_knowledge && !streaming && (
            <p
              className="mb-3 inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md"
              style={{ backgroundColor: t.raised, color: t.text, border: '1px solid ' + t.border }}
            >
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              General knowledge · not from your documents
            </p>
          )}

          {m.error ? (
            <div className="rounded-lg p-4" style={{ backgroundColor: t.raised, border: '1px solid ' + t.border }}>
              <p className="flex items-start gap-2 text-sm leading-6">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" style={{ color: t.accentText }} />
                <span>{m.content}</span>
              </p>
              <button
                type="button"
                onClick={() => regenerate(conv.id, m.id)}
                className={'mt-3 text-xs font-medium px-3 py-1.5 rounded-md ' + focusRing}
                style={fx({ backgroundColor: brand.primaryColor, color: t.onPrimary })}
              >
                Retry
              </button>
            </div>
          ) : (
            <div
              className="text-[15px]"
              style={{ color: t.text }}
              aria-live={streaming ? 'polite' : 'off'}
              aria-busy={streaming ? 'true' : 'false'}
            >
              {renderBody(body, citations, m.id)}
              {streaming && (
                <span className="inline-block h-4 w-2 align-middle animate-pulse" style={{ backgroundColor: brand.primaryColor }} aria-hidden="true" />
              )}
            </div>
          )}

          {citations.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-medium mb-2" style={{ color: t.subtext }}>Sources</h3>
              <ol className="flex flex-wrap gap-2">
                {citations.map((c) => {
                  const doc = DOCS[c.document_id];
                  return (
                    <li key={m.id + 'c' + c.chip_number}>
                      <button
                        type="button"
                        onClick={() => openSource(c)}
                        className={'inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md max-w-[16rem] ' + focusRing}
                        style={fx({ backgroundColor: t.accentBg, border: '1px solid ' + t.accentBorder, color: t.accentText })}
                      >
                        <span className="font-semibold">{c.chip_number}</span>
                        <span className="truncate">{doc ? doc.filename : 'Document unavailable'}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {!streaming && !m.error && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => copyAnswer(m.content)} className={actionBtn} style={fx({ color: t.subtext, border: '1px solid ' + t.border })}>
                Copy
              </button>
              <button
                type="button"
                onClick={() => toggleSpeak(m)}
                disabled={!speechSupported}
                title={speechSupported ? undefined : 'Your browser does not support speech synthesis'}
                className={actionBtn + (speechSupported ? '' : ' opacity-50 cursor-not-allowed')}
                style={fx({ color: speakingId === m.id ? t.onPrimary : t.subtext, border: '1px solid ' + t.border, backgroundColor: speakingId === m.id ? brand.primaryColor : 'transparent' })}
              >
                {speakingId === m.id ? 'Stop reading' : 'Read aloud'}
              </button>
              <button
                type="button"
                onClick={() => regenerate(conv.id, m.id)}
                disabled={!!stream}
                className={actionBtn + (stream ? ' opacity-50 cursor-not-allowed' : '')}
                style={fx({ color: t.subtext, border: '1px solid ' + t.border })}
              >
                Regenerate
              </button>
              <span className="text-[11px] ml-1" style={{ color: t.faint }}>{timeOf(m.created_at)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const railBtn = 'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ' + focusRing;

  /* ---------- render ---------- */

  return (
    <div
      className="flex h-full min-h-[760px] w-full relative overflow-hidden"
      style={{ backgroundColor: t.bg, color: t.text, fontFamily: brand.fontBody, borderRadius: brand.radius }}
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
            ? 'fixed inset-y-0 left-0 z-40 w-[278px] md:static md:z-auto'
            : 'w-[62px] shrink-0') + ' flex flex-col shrink-0 border-r'
        }
        style={{ backgroundColor: t.rail, borderColor: t.border }}
      >
        <div className={'flex items-center gap-2 p-3 ' + (sidebarOpen ? 'justify-between' : 'justify-center')}>
          {sidebarOpen && (
            <span className="text-sm font-semibold tracking-tight pl-1" style={{ color: t.text }}>Knowledge Assistant</span>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarOpen}
            className={'h-8 w-8 flex items-center justify-center rounded-lg ' + focusRing}
            style={fx({ color: t.subtext, border: '1px solid ' + t.border })}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>

        <div className={'px-3 ' + (sidebarOpen ? '' : 'px-2')}>
          <button
            type="button"
            onClick={newChat}
            className={
              (sidebarOpen ? 'w-full justify-start gap-2 px-3' : 'w-full justify-center') +
              ' flex items-center py-2 rounded-lg text-sm font-medium ' + focusRing
            }
            style={fx({ backgroundColor: brand.primaryColor, color: t.onPrimary })}
            aria-label={sidebarOpen ? undefined : 'New chat'}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {sidebarOpen && <span>New chat</span>}
          </button>
        </div>

        {sidebarOpen ? (
          <div className="px-3 pt-3">
            <Label htmlFor="chat-search" className="sr-only">Search chats</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" style={{ color: t.faint }} />
              <input
                id="chat-search"
                ref={searchRef}
                type="search"
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
                placeholder="Search chats"
                className={'w-full text-sm rounded-lg pl-9 pr-3 py-2 ' + focusRing}
                style={fx({ backgroundColor: t.panel, border: '1px solid ' + t.border, color: t.text })}
              />
            </div>
          </div>
        ) : (
          <div className="px-2 pt-3">
            <button
              type="button"
              aria-label="Search chats"
              onClick={() => { setSidebarOpen(true); window.setTimeout(() => searchRef.current && searchRef.current.focus(), 0); }}
              className={'w-full flex justify-center py-2 rounded-lg ' + focusRing}
              style={fx({ color: t.subtext })}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <ul className="px-2 md:px-3 pt-3 space-y-0.5" aria-label="Pages">
          {[
            { label: 'Knowledge base', route: 'knowledge-base', Icon: Package },
            { label: 'Getting started', route: 'getting-started', Icon: FileText },
            { label: 'API reference', route: 'api-reference', Icon: Settings }
          ].map(({ label, route, Icon }) => (
            <li key={route}>
              <button
                type="button"
                onClick={() => navigate(route)}
                aria-label={sidebarOpen ? undefined : label}
                className={(sidebarOpen ? railBtn : 'w-full flex justify-center py-2 rounded-lg ' + focusRing) + ' hover:opacity-100'}
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
                No saved chats yet. Your conversations appear here once you ask your first question.
              </p>
            ) : grouped.length === 0 ? (
              <div className="px-1 py-2">
                <p className="text-xs leading-5" style={{ color: t.subtext }}>No chats match “{chatQuery}”.</p>
                <button type="button" onClick={() => setChatQuery('')} className={'mt-2 text-xs underline ' + focusRing} style={fx({ color: brand.primaryColor })}>
                  Clear search
                </button>
              </div>
            ) : (
              <ul className="space-y-4" aria-label="Chat history">
                {grouped.map((g) => (
                  <li key={g.label}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide px-1 mb-1.5" style={{ color: t.faint }}>{g.label}</p>
                    <ul aria-label={g.label} className="space-y-0.5">
                      {g.items.map((c) => {
                        const isActive = c.id === activeId;
                        return (
                          <li key={c.id} className="group relative">
                            <button
                              type="button"
                              onClick={() => openConversation(c.id)}
                              aria-current={isActive ? 'true' : undefined}
                              className={'w-full text-left text-sm rounded-lg pl-3 pr-9 py-2 truncate ' + focusRing}
                              style={fx({
                                backgroundColor: isActive ? t.raised : 'transparent',
                                color: isActive ? t.text : t.subtext,
                                borderLeft: isActive ? '2px solid ' + brand.primaryColor : '2px solid transparent'
                              })}
                            >
                              {c.title}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDelete(c.id)}
                              aria-label={'Delete conversation ' + c.title}
                              className={'absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 ' + focusRing}
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
        <div className="p-2 md:p-3 border-t relative" style={{ borderColor: t.border }} ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={sidebarOpen ? undefined : 'Account menu'}
            className={(sidebarOpen ? 'w-full flex items-center gap-2.5 px-2 py-2' : 'w-full flex justify-center py-2') + ' rounded-lg ' + focusRing}
            style={fx({ color: t.text })}
          >
            <span
              aria-hidden="true"
              className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{ backgroundColor: t.raised, color: t.text, border: '1px solid ' + t.border }}
            >
              {CURRENT_USER.initials}
            </span>
            {sidebarOpen && (
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-sm truncate">{CURRENT_USER.name}</span>
                <span className="block text-[11px] truncate" style={{ color: t.subtext }}>{CURRENT_USER.email}</span>
              </span>
            )}
            {sidebarOpen && <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" style={{ color: t.subtext }} />}
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="Account"
              className="absolute bottom-full left-2 right-2 mb-2 rounded-xl p-2 shadow-2xl z-50"
              style={{ backgroundColor: t.panel, border: '1px solid ' + t.border }}
            >
              <div className="px-2 py-2">
                <p className="text-sm font-medium truncate">{CURRENT_USER.name}</p>
                <p className="text-[11px] truncate" style={{ color: t.subtext }}>{CURRENT_USER.email}</p>
              </div>
              <div className="h-px my-1" style={{ backgroundColor: t.border }} />
              <fieldset className="px-2 py-2">
                <legend className="text-[11px] uppercase tracking-wide mb-2" style={{ color: t.faint }}>Theme</legend>
                <div className="flex gap-1">
                  {['Light', 'Dark', 'System'].map((label) => {
                    const value = label.toLowerCase();
                    const on = theme === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTheme(value)}
                        aria-pressed={on}
                        className={'flex-1 text-xs py-1.5 rounded-md ' + focusRing}
                        style={fx({
                          backgroundColor: on ? brand.primaryColor : 'transparent',
                          color: on ? t.onPrimary : t.subtext,
                          border: '1px solid ' + (on ? brand.primaryColor : t.border)
                        })}
                      >
                        {on ? '✓ ' : ''}{label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="h-px my-1" style={{ backgroundColor: t.border }} />
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); navigate('account'); }}
                className={'w-full text-left text-sm px-2 py-2 rounded-md ' + focusRing}
                style={fx({ color: t.text })}
              >
                Change password
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); stopSpeech(); navigate('sign-in'); }}
                className={'w-full text-left text-sm px-2 py-2 rounded-md ' + focusRing}
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
                <h1 className="text-base sm:text-lg font-semibold truncate" style={{ fontFamily: brand.fontHeading }}>
                  {activeConv.title}
                </h1>
                <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: t.subtext }}>
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {groupOf(activeConv.updated_at)} · {timeOf(activeConv.updated_at)} · private to you
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(activeConv.id)}
                className={'shrink-0 inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg ' + focusRing}
                style={fx({ color: t.subtext, border: '1px solid ' + t.border })}
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
                    {m.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%]">
                          <p className="text-[11px] mb-1 text-right" style={{ color: t.faint }}>
                            {CURRENT_USER.first_name} · {timeOf(m.created_at)}
                          </p>
                          <p
                            className="text-[15px] leading-7 rounded-2xl px-4 py-3"
                            style={{ backgroundColor: t.raised, border: '1px solid ' + t.border, color: t.text }}
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
              <h1 className="text-3xl sm:text-[2.6rem] font-semibold tracking-tight leading-tight" style={{ fontFamily: brand.fontHeading }}>
                <span style={{ backgroundImage: 'linear-gradient(90deg,#5B9CF8,#9B7BF0,#F08BB4)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                  Hello, {CURRENT_USER.first_name}
                </span>
                <span style={{ color: t.subtext }}> — How can I help you today?</span>
              </h1>
              <p className="mt-4 text-sm leading-6 max-w-xl" style={{ color: t.subtext }}>
                Ask anything about the shared company knowledge base. Answers are drawn from uploaded documents first and
                cite the sources they used.
              </p>

              <h2 className="sr-only">Suggested questions</h2>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <li key={s.title}>
                    <button
                      type="button"
                      onClick={() => send(s.text)}
                      className={'w-full text-left rounded-xl p-4 h-full transition-colors hover:brightness-110 ' + focusRing}
                      style={fx({ backgroundColor: t.panel, border: '1px solid ' + t.border })}
                    >
                      <span className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: t.accentText }}>
                        {s.title}
                      </span>
                      <span className="block text-sm leading-6" style={{ color: t.text }}>{s.text}</span>
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
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            <Label htmlFor="message" className="sr-only">Your question</Label>
            <div className="rounded-2xl p-2.5" style={{ backgroundColor: t.panel, border: '1px solid ' + t.border }}>
              <textarea
                id="message"
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
                }}
                placeholder="Ask about a policy, a process or a document…"
                className={'w-full resize-none bg-transparent px-3 py-2 text-[15px] leading-7 max-h-[200px] ' + focusRing}
                style={fx({ color: t.text })}
              />
              <div className="flex items-center justify-between gap-3 px-1 pt-1">
                <p className="text-[11px]" style={{ color: t.faint }}>
                  Enter to send · Shift + Enter for a new line
                </p>
                {stream ? (
                  <button
                    type="button"
                    onClick={stopStream}
                    className={'inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl ' + focusRing}
                    style={fx({ backgroundColor: t.raised, color: t.text, border: '1px solid ' + t.border })}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={input.trim().length === 0}
                    className={'inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl ' + focusRing + (input.trim().length === 0 ? ' opacity-45 cursor-not-allowed' : '')}
                    style={fx({ backgroundColor: brand.primaryColor, color: t.onPrimary })}
                  >
                    Send
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-center" style={{ color: t.faint }}>
              The knowledge base is shared with everyone at the company. Check the cited source before acting on an answer.
            </p>
            <p className="sr-only" role="status">{stream ? 'Answer streaming' : ''}</p>
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
          <div className="flex items-start justify-between gap-3 p-4 border-b" style={{ borderColor: t.border }}>
            <h2 className="text-sm font-semibold" style={{ fontFamily: brand.fontHeading }}>
              Source {panel.citation.chip_number}
            </h2>
            <button
              type="button"
              onClick={() => setPanel(null)}
              aria-label="Close source panel"
              className={'h-8 w-8 flex items-center justify-center rounded-lg ' + focusRing}
              style={fx({ color: t.subtext, border: '1px solid ' + t.border })}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {!panel.doc ? (
              <div className="rounded-lg p-4" style={{ backgroundColor: t.raised, border: '1px solid ' + t.border }}>
                <p className="flex items-start gap-2 text-sm leading-6">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" style={{ color: t.accentText }} />
                  <span>
                    This document is no longer available. It was deleted from the shared knowledge base after this answer
                    was generated, so the original file and its excerpt cannot be opened.
                  </span>
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium break-words">{panel.doc.filename}</p>
                <dl className="mt-4 space-y-3 text-sm">
                  {[
                    ['Type', panel.doc.file_type],
                    ['Size', formatBytes(panel.doc.size_bytes)],
                    ['Uploaded by', panel.doc.uploaded_by],
                    ['Uploaded', panel.doc.uploaded_at]
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt style={{ color: t.subtext }}>{k}</dt>
                      <dd className="text-right">{v}</dd>
                    </div>
                  ))}
                </dl>

                <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: t.faint }}>
                  Retrieved excerpt
                </h3>
                <blockquote
                  className="text-sm leading-6 rounded-lg p-3 whitespace-pre-line"
                  style={{ backgroundColor: t.raised, borderLeft: '3px solid ' + t.accentBorder, color: t.text }}
                >
                  {panel.citation.excerpt}
                </blockquote>

                <div className="mt-6 space-y-2">
                  <button
                    type="button"
                    onClick={() => setToast('Downloading ' + panel.doc.filename)}
                    className={'w-full inline-flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ' + focusRing}
                    style={fx({ backgroundColor: brand.primaryColor, color: t.onPrimary })}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download original
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('knowledge-base')}
                    className={'w-full inline-flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg ' + focusRing}
                    style={fx({ color: t.text, border: '1px solid ' + t.border })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: t.overlay }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-title"
            aria-describedby="del-desc"
            className="w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: t.panel, border: '1px solid ' + t.border }}
          >
            <h2 id="del-title" className="text-base font-semibold" style={{ fontFamily: brand.fontHeading }}>
              Delete this conversation?
            </h2>
            <p id="del-desc" className="mt-2 text-sm leading-6" style={{ color: t.subtext }}>
              “{(conversations.find((c) => c.id === pendingDelete) || {}).title}” and all of its messages will be
              permanently removed from your history. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                ref={cancelRef}
                onClick={() => setPendingDelete(null)}
                className={'text-sm px-4 py-2 rounded-lg ' + focusRing}
                style={fx({ color: t.text, border: '1px solid ' + t.border })}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className={'text-sm font-medium px-4 py-2 rounded-lg ' + focusRing}
                style={fx({ backgroundColor: '#E2544A', color: '#FFFFFF' })}
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
          style={{ backgroundColor: t.panel, border: '1px solid ' + t.border, color: t.text }}
        >
          <CheckCircle className="h-4 w-4" aria-hidden="true" style={{ color: brand.primaryColor }} />
          {toast}
        </div>
      )}
    </div>
  );
}
