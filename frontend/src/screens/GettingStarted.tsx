// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

const { Button, Input, Label } = UI;
const { Search, Check, X, ChevronRight, ChevronDown, Home, FileText, Package, Calendar, Clock, Download, Upload, ArrowLeft, AlertCircle, CheckCircle } = Icons;

const SURFACE = '#161B22';
const SURFACE_2 = '#1B2129';
const BORDER = 'rgba(255,255,255,0.09)';
const TEXT = '#E7ECF3';

const SECTIONS = [
  {
    id: 'ask',
    title: 'Ask your first question',
    minutes: '1 min',
    summary:
      'Type a question the way you would ask a colleague. Every question is searched against the shared knowledge base before the assistant writes a single word.',
    points: [
      'Press Enter to send, Shift + Enter for a new line. The message box grows as your question does.',
      'Name the thing you are after. "What is the notice period in the UK contract template?" finds far more than "notice period".',
      'Follow-ups keep their place. Ask "and what about contractors?" and the assistant stays on the same subject.',
      'New chat starts a clean slate — nothing from the previous conversation is carried into the next one.',
    ],
    keywords: 'question prompt message box enter suggestion cards welcome follow-up context new chat',
  },
  {
    id: 'streaming',
    title: 'Watch the answer arrive',
    minutes: '1 min',
    summary:
      'The first words usually appear within about two seconds and the rest streams in live. You stay in control the whole time it is writing.',
    points: [
      'Stop halts the answer immediately. The part already written is kept in the thread and marked Stopped.',
      'Regenerate re-asks the same question with the same conversation context and streams a fresh answer in its place.',
      'Copy puts the answer text on your clipboard and confirms it in the corner of the screen.',
      'Read aloud uses your browser’s own voice. If your browser cannot speak, the control is disabled with a short explanation.',
    ],
    keywords: 'stream stop regenerate copy read aloud speech retry error keyboard shortcuts',
  },
  {
    id: 'sources',
    title: 'Read the source chips',
    minutes: '2 min',
    summary:
      'Amber numbered chips sit underneath an answer. Each one is a document a statement was drawn from — click a chip to see the exact excerpt that was used.',
    points: [
      'Chip numbers match the bracketed references in the answer text, so [2] in a sentence is always chip 2 below it.',
      'Clicking a chip opens a side panel with the file name, type, upload date, uploader and the retrieved excerpt, plus a link to the original file.',
      'Clicking another chip switches the panel without losing your place in the conversation. Esc closes it.',
      'An answer labelled "General knowledge · not from your documents" has no chips: nothing in the library was relevant enough, so treat it as you would any web answer.',
      'If the document has since been deleted, the panel says so rather than erroring.',
    ],
    keywords: 'citation chip source panel excerpt reference general knowledge relevance threshold deleted',
  },
  {
    id: 'uploads',
    title: 'Add documents to the knowledge base',
    minutes: '2 min',
    summary:
      'Drag files onto the dropzone on the Knowledge base page, or pick them from your computer. A few pages are parsed, chunked and searchable within seconds.',
    points: [
      'A file appears in the table as Processing the moment it starts uploading, then flips to Ready on its own — no refresh needed.',
      'Failed rows show a short reason, such as a password-protected PDF or a scan with no text layer. Delete it, fix it, upload it again.',
      'Only text is indexed in this release. Pictures, charts and scanned pages inside a file are not read.',
      'Search the table by file name and filter by status or file type to find anything in a large library.',
    ],
    keywords: 'upload dropzone pdf docx txt markdown size limit processing ready failed ingest chunk embed',
  },
  {
    id: 'shared',
    title: 'The library is shared and open',
    minutes: '1 min',
    summary:
      'There is one company-wide knowledge base. Everything you upload is answerable by everyone, and everything anyone else uploads is answerable by you.',
    points: [
      'Any signed-in employee may upload, download or delete any document, whoever added it. Administrators have no extra document rights.',
      'Deletion is permanent. There is no recycle bin and no undo, so you are always asked to confirm first.',
      'Once a document is deleted, its chunks go with it and it stops being cited in new answers straight away.',
      'Before uploading, check the file is something the whole company may read.',
    ],
    keywords: 'shared open library delete permanent confirm uploader everyone admin rights',
  },
  {
    id: 'privacy',
    title: 'Your chats stay private',
    minutes: '1 min',
    summary:
      'Documents are shared; conversations are not. Your chat history belongs to your account alone and is saved as you go.',
    points: [
      'A conversation is created the moment your first answer finishes, titled from your first question.',
      'The sidebar groups history by date — Today, Yesterday, Previous 30 days — newest first.',
      'Search chats narrows the history by conversation title or message text.',
      'Delete removes a conversation and all of its messages for good. Nobody else, administrator included, can read your chats.',
    ],
    keywords: 'conversation history private sidebar search delete date grouped',
  },
  {
    id: 'account',
    title: 'Set up your desk',
    minutes: '1 min',
    summary:
      'The account menu at the foot of the sidebar carries your name, your theme choice, your password and the way out.',
    points: [
      'Light, Dark or System applies immediately and is remembered on this browser, including on the sign-in page.',
      'Change password asks for your current password and the new one twice. The minimum length is 12 characters.',
      'Signing out ends the session on the server — the back button will not bring your chats back.',
      'There is no password-reset email. If you are locked out, your administrator sets a new password for you.',
    ],
    keywords: 'theme light dark system password change sign out session collapse sidebar account menu',
  },
];

const DEMO_SOURCES = [
  {
    chip: 1,
    filename: 'Employee-Handbook-2026.pdf',
    file_type: 'PDF',
    size: '2.4 MB',
    uploaded_by: 'Priya Raghavan',
    uploaded_at: '12 Sep 2026',
    available: true,
    excerpt:
      'During the probationary period either party may end the agreement with one month’s written notice. On confirmation of employment the notice period rises to three months for all UK-based staff, unless a longer period is stated in the individual offer letter.',
  },
  {
    chip: 2,
    filename: 'Remote-Work-Policy.docx',
    file_type: 'DOCX',
    size: '318 KB',
    uploaded_by: 'Marcus Oyelaran',
    uploaded_at: '28 Sep 2026',
    available: true,
    excerpt:
      'Remote colleagues follow the same notice schedule as office-based colleagues. Company equipment must be returned, or collection arranged with IT, within five working days of the final working day.',
  },
  {
    chip: 3,
    filename: 'Security-Onboarding-v3.md',
    file_type: 'Markdown',
    size: '42 KB',
    uploaded_by: 'Dana Whitfield',
    uploaded_at: '03 Aug 2026',
    available: false,
    deleted_on: '01 Oct 2026',
    excerpt:
      'All leavers lose access to the knowledge base at the end of their last working day. Device wipe is confirmed by IT within 24 hours.',
  },
];

const FILE_TYPES = [
  { format: 'PDF', ext: '.pdf', max: '25 MB', indexed: 'The text layer. Scans with no text layer fail.' },
  { format: 'Word', ext: '.docx', max: '25 MB', indexed: 'Paragraphs, headings and table text.' },
  { format: 'Plain text', ext: '.txt', max: '25 MB', indexed: 'The whole file.' },
  { format: 'Markdown', ext: '.md, .markdown', max: '25 MB', indexed: 'The whole file, formatting kept as text.' },
];

const SHORTCUTS = [
  { keys: 'Enter', does: 'Send the question in the message box' },
  { keys: 'Shift + Enter', does: 'Start a new line instead of sending' },
  { keys: 'Esc', does: 'Stop an answer that is streaming, or close the source panel' },
  { keys: 'Ctrl + /', does: 'Collapse or expand the left rail' },
];

const FAQS = [
  {
    q: 'I have forgotten my password. Can I reset it myself?',
    a: 'No — this instance has no email service, so there is no reset link. Ask your administrator to set a new password for you. If you do know your current password, change it yourself from Account › Change password.',
  },
  {
    q: 'Why was my sign-in refused even though the password was right?',
    a: 'After five failed attempts on one email address within fifteen minutes, that address is locked for fifteen minutes and even the correct password is refused. Wait, then try again — a successful sign-in resets the counter.',
  },
  {
    q: 'Can I really delete a document somebody else uploaded?',
    a: 'Yes. The library is deliberately open: every signed-in employee has the same rights over every document. You will be asked to confirm, and the deletion is permanent.',
  },
  {
    q: 'An answer says "General knowledge". Is it wrong?',
    a: 'Not necessarily, but it did not come from your documents. It means no chunk of any uploaded file cleared the relevance threshold, so the model answered from what it already knows. Upload the source material and ask again to get a cited answer.',
  },
  {
    q: 'My upload says Failed. What should I do?',
    a: 'Read the reason in the row — usually a password-protected PDF or a scan with no extractable text. Delete the row, produce a text-bearing version of the file, and upload it again.',
  },
];

export default function Screen() {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState('');
  const [activeId, setActiveId] = React.useState(SECTIONS[0].id);
  const [openChip, setOpenChip] = React.useState(null);
  const [openFaq, setOpenFaq] = React.useState(null);
  const [helpful, setHelpful] = React.useState(null);
  const closeRef = React.useRef(null);

  const q = query.trim().toLowerCase();
  const visible = SECTIONS.filter(
    (s) =>
      !q ||
      (s.title + ' ' + s.summary + ' ' + s.points.join(' ') + ' ' + s.keywords).toLowerCase().includes(q)
  );

  const source = DEMO_SOURCES.find((s) => s.chip === openChip) || null;

  React.useEffect(() => {
    if (!source) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenChip(null);
    };
    window.addEventListener('keydown', onKey);
    if (closeRef.current) closeRef.current.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [source]);

  const goToSection = (id) => {
    setActiveId(id);
    const el = document.getElementById('sec-' + id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const h = document.getElementById('h-' + id);
      if (h) h.focus({ preventScroll: true });
    }
  };

  const panelStyle = {
    backgroundColor: SURFACE,
    border: '1px solid ' + BORDER,
    borderRadius: brand.radius,
  };

  const chipStyle = (on) => ({
    backgroundColor: on ? 'rgba(244,162,89,0.22)' : 'rgba(244,162,89,0.12)',
    border: '1px solid ' + (on ? brand.accentColor : 'rgba(244,162,89,0.45)'),
    color: brand.accentColor,
    borderRadius: '999px',
  });

  return (
    <div
      className="min-h-full w-full"
      style={{ backgroundColor: brand.backgroundColor, color: TEXT, fontFamily: brand.fontBody }}
    >
      <style>{`
        .nd-focus:focus-visible { outline: 2px solid ${brand.primaryColor}; outline-offset: 2px; }
        .nd-anchor { scroll-margin-top: 1.5rem; }
        .nd-anchor:focus { outline: none; }
        .nd-anchor:focus-visible { outline: 2px solid ${brand.primaryColor}; outline-offset: 4px; }
      `}</style>

      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
        {/* Header */}
        <header className="mb-10">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: brand.neutralColor }}
          >
            Help
          </p>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <h1
                className="text-3xl font-semibold leading-tight sm:text-4xl"
                style={{ fontFamily: brand.fontHeading }}
              >
                Getting started with Knowledge Assistant
              </h1>
              <p className="mt-4 text-base leading-relaxed" style={{ color: '#B9C2CD' }}>
                A seven-minute read covering how to ask a question, how to read the amber source chips under
                an answer, and how documents get into the shared knowledge base everybody draws on.
              </p>
            </div>
            <div className="shrink-0">
              <UI.Button
                className="nd-focus w-full justify-center font-medium sm:w-auto"
                style={{ backgroundColor: brand.primaryColor, color: '#0B0F13', borderRadius: brand.radius }}
                onClick={() => navigate('chat')}
              >
                <Icons.ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to chat
              </UI.Button>
            </div>
          </div>
          <div
            className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
            style={{ color: brand.neutralColor }}
          >
            <span className="inline-flex items-center gap-2">
              <Icons.Clock className="h-4 w-4" aria-hidden="true" />7 minute read
            </span>
            <span className="inline-flex items-center gap-2">
              <Icons.Calendar className="h-4 w-4" aria-hidden="true" />
              Updated 2 October 2026
            </span>
            <span className="inline-flex items-center gap-2">
              <Icons.FileText className="h-4 w-4" aria-hidden="true" />
              Applies to release 1.4
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-14">
          {/* Contents rail */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="p-4" style={panelStyle}>
              <UI.Label
                htmlFor="guide-search"
                className="mb-2 block text-sm font-medium"
                style={{ color: TEXT }}
              >
                Search this guide
              </UI.Label>
              <div className="relative">
                <Icons.Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: brand.neutralColor }}
                  aria-hidden="true"
                />
                <UI.Input
                  id="guide-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. upload, chips, password"
                  className="nd-focus w-full pl-9"
                  style={{
                    backgroundColor: '#0E1217',
                    color: TEXT,
                    border: '1px solid ' + BORDER,
                    borderRadius: brand.radius,
                  }}
                />
              </div>
              <p className="mt-3 text-xs" role="status" style={{ color: brand.neutralColor }}>
                Showing {visible.length} of {SECTIONS.length} topics
              </p>

              <hr className="my-4" style={{ borderColor: BORDER }} />

              <nav aria-label="On this page">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: brand.neutralColor }}>
                  On this page
                </h2>
                {visible.length === 0 ? (
                  <p className="text-sm" style={{ color: brand.neutralColor }}>
                    No topics match your search.
                  </p>
                ) : (
                  <ol className="space-y-1">
                    {visible.map((s, i) => {
                      const on = activeId === s.id;
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => goToSection(s.id)}
                            className="nd-focus flex w-full items-baseline gap-3 px-2 py-2 text-left text-sm transition-colors hover:bg-white/5"
                            style={{
                              borderRadius: brand.radius,
                              backgroundColor: on ? 'rgba(91,156,248,0.14)' : 'transparent',
                              color: on ? '#CFE0FF' : '#C3CCD7',
                              borderLeft: '2px solid ' + (on ? brand.primaryColor : 'transparent'),
                            }}
                            aria-current={on ? 'true' : undefined}
                          >
                            <span className="tabular-nums" style={{ color: brand.neutralColor }}>
                              {i + 1}.
                            </span>
                            <span className="flex-1">{s.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </nav>
            </div>
          </div>

          {/* Main content */}
          <main className="min-w-0">
            {visible.length === 0 ? (
              <div className="px-6 py-16 text-center" style={panelStyle}>
                <Icons.Search className="mx-auto h-6 w-6" style={{ color: brand.neutralColor }} aria-hidden="true" />
                <h2 className="mt-4 text-lg font-semibold">No topics match &ldquo;{query.trim()}&rdquo;</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed" style={{ color: brand.neutralColor }}>
                  Try a word like <em>upload</em>, <em>chips</em>, <em>private</em> or <em>password</em> — or clear
                  the search to read the guide from the top.
                </p>
                <UI.Button
                  className="nd-focus mt-6"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid ' + BORDER,
                    color: TEXT,
                    borderRadius: brand.radius,
                  }}
                  onClick={() => setQuery('')}
                >
                  Clear search
                </UI.Button>
              </div>
            ) : (
              <div className="space-y-12">
                {visible.map((s) => (
                  <section key={s.id} id={'sec-' + s.id} className="nd-anchor" aria-labelledby={'h-' + s.id}>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2
                        id={'h-' + s.id}
                        tabIndex={-1}
                        className="nd-anchor text-xl font-semibold sm:text-2xl"
                        style={{ fontFamily: brand.fontHeading }}
                      >
                        {s.title}
                      </h2>
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs"
                        style={{
                          border: '1px solid ' + BORDER,
                          borderRadius: '999px',
                          color: brand.neutralColor,
                        }}
                      >
                        <Icons.Clock className="h-3 w-3" aria-hidden="true" />
                        {s.minutes}
                      </span>
                    </div>

                    <p className="mt-4 text-base leading-relaxed" style={{ color: '#B9C2CD' }}>
                      {s.summary}
                    </p>

                    <ul className="mt-5 space-y-3">
                      {s.points.map((p, i) => (
                        <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                          <Icons.Check
                            className="mt-1 h-4 w-4 shrink-0"
                            style={{ color: brand.primaryColor }}
                            aria-hidden="true"
                          />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>

                    {s.id === 'ask' && (
                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div className="p-4" style={panelStyle}>
                          <p className="flex items-center gap-2 text-sm font-semibold">
                            <Icons.X className="h-4 w-4" style={{ color: '#E88A8A' }} aria-hidden="true" />
                            Too vague
                          </p>
                          <p className="mt-2 text-sm leading-relaxed" style={{ color: brand.neutralColor }}>
                            &ldquo;expenses policy?&rdquo;
                          </p>
                        </div>
                        <div className="p-4" style={panelStyle}>
                          <p className="flex items-center gap-2 text-sm font-semibold">
                            <Icons.CheckCircle className="h-4 w-4" style={{ color: '#7FD1A0' }} aria-hidden="true" />
                            Specific enough to retrieve
                          </p>
                          <p className="mt-2 text-sm leading-relaxed" style={{ color: brand.neutralColor }}>
                            &ldquo;What is the per-night hotel limit for travel inside the EU, and who approves
                            anything above it?&rdquo;
                          </p>
                        </div>
                      </div>
                    )}

                    {s.id === 'streaming' && (
                      <div className="mt-6 overflow-hidden" style={panelStyle}>
                        <h3 className="px-4 pt-4 text-sm font-semibold">Keyboard shortcuts</h3>
                        <div
                          className="mt-3 overflow-x-auto"
                          tabIndex={0}
                          role="region"
                          aria-label="Keyboard shortcuts table, scrollable"
                        >
                          <table className="w-full min-w-[26rem] border-collapse text-sm">
                            <caption className="sr-only">Keyboard shortcuts for the chat screen</caption>
                            <thead>
                              <tr style={{ borderTop: '1px solid ' + BORDER, borderBottom: '1px solid ' + BORDER }}>
                                <th
                                  scope="col"
                                  className="px-4 py-2.5 text-left font-medium"
                                  style={{ color: brand.neutralColor }}
                                >
                                  Keys
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 py-2.5 text-left font-medium"
                                  style={{ color: brand.neutralColor }}
                                >
                                  What happens
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {SHORTCUTS.map((k) => (
                                <tr key={k.keys} style={{ borderBottom: '1px solid ' + BORDER }}>
                                  <th scope="row" className="px-4 py-3 text-left align-top font-medium">
                                    <span
                                      className="inline-block px-2 py-1 text-xs"
                                      style={{
                                        backgroundColor: SURFACE_2,
                                        border: '1px solid ' + BORDER,
                                        borderRadius: '0.375rem',
                                      }}
                                    >
                                      {k.keys}
                                    </span>
                                  </th>
                                  <td className="px-4 py-3 align-middle" style={{ color: '#B9C2CD' }}>
                                    {k.does}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {s.id === 'sources' && (
                      <div className="mt-6 p-5" style={panelStyle}>
                        <h3 className="text-sm font-semibold">Try it: an example answer</h3>
                        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: '#B9C2CD' }}>
                          Employees in the UK serve one month&rsquo;s notice during probation, rising to three
                          months once employment is confirmed{' '}
                          <span style={{ color: brand.accentColor }}>[1]</span>. Remote colleagues follow the same
                          schedule, and return company equipment within five working days of their last day{' '}
                          <span style={{ color: brand.accentColor }}>[2]</span>. Knowledge base access ends on the
                          final working day <span style={{ color: brand.accentColor }}>[3]</span>.
                        </p>
                        <h4 className="mt-5 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: brand.neutralColor }}>
                          Sources
                        </h4>
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {DEMO_SOURCES.map((d) => (
                            <li key={d.chip}>
                              <button
                                type="button"
                                onClick={() => setOpenChip(d.chip === openChip ? null : d.chip)}
                                aria-expanded={openChip === d.chip}
                                className="nd-focus inline-flex items-center gap-2 px-3 py-1.5 text-sm"
                                style={chipStyle(openChip === d.chip)}
                              >
                                <span
                                  className="inline-flex h-4 w-4 items-center justify-center text-[11px] font-semibold tabular-nums"
                                  aria-hidden="true"
                                >
                                  {d.chip}
                                </span>
                                <span className="max-w-[16rem] truncate">{d.filename}</span>
                                {!d.available && (
                                  <span className="text-[11px] uppercase tracking-wide">· deleted</span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-4 text-xs leading-relaxed" style={{ color: brand.neutralColor }}>
                          Chip 3 shows what you see when the document behind an older answer has since been
                          removed from the library.
                        </p>
                      </div>
                    )}

                    {s.id === 'uploads' && (
                      <>
                        <div className="mt-6 overflow-hidden" style={panelStyle}>
                          <h3 className="px-4 pt-4 text-sm font-semibold">What you can upload</h3>
                          <div
                            className="mt-3 overflow-x-auto"
                            tabIndex={0}
                            role="region"
                            aria-label="Supported file types table, scrollable"
                          >
                            <table className="w-full min-w-[34rem] border-collapse text-sm">
                              <caption className="sr-only">
                                Supported file formats, extensions, size limits and what is indexed
                              </caption>
                              <thead>
                                <tr style={{ borderTop: '1px solid ' + BORDER, borderBottom: '1px solid ' + BORDER }}>
                                  <th scope="col" className="px-4 py-2.5 text-left font-medium" style={{ color: brand.neutralColor }}>
                                    Format
                                  </th>
                                  <th scope="col" className="px-4 py-2.5 text-left font-medium" style={{ color: brand.neutralColor }}>
                                    Extension
                                  </th>
                                  <th scope="col" className="px-4 py-2.5 text-left font-medium" style={{ color: brand.neutralColor }}>
                                    Max size
                                  </th>
                                  <th scope="col" className="px-4 py-2.5 text-left font-medium" style={{ color: brand.neutralColor }}>
                                    What gets indexed
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {FILE_TYPES.map((f) => (
                                  <tr key={f.format} style={{ borderBottom: '1px solid ' + BORDER }}>
                                    <th scope="row" className="px-4 py-3 text-left font-medium">
                                      {f.format}
                                    </th>
                                    <td className="px-4 py-3 font-mono text-[13px]" style={{ color: '#B9C2CD' }}>
                                      {f.ext}
                                    </td>
                                    <td className="px-4 py-3 tabular-nums" style={{ color: '#B9C2CD' }}>
                                      {f.max}
                                    </td>
                                    <td className="px-4 py-3" style={{ color: '#B9C2CD' }}>
                                      {f.indexed}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="mt-4 p-5" style={panelStyle}>
                          <h3 className="text-sm font-semibold">What the statuses mean</h3>
                          <dl className="mt-4 space-y-4">
                            <div className="flex gap-3">
                              <Icons.Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: brand.accentColor }} aria-hidden="true" />
                              <div>
                                <dt className="text-sm font-medium">Processing</dt>
                                <dd className="text-sm leading-relaxed" style={{ color: brand.neutralColor }}>
                                  The file is being read, split into chunks and embedded. Usually a few seconds.
                                </dd>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <Icons.CheckCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#7FD1A0' }} aria-hidden="true" />
                              <div>
                                <dt className="text-sm font-medium">Ready</dt>
                                <dd className="text-sm leading-relaxed" style={{ color: brand.neutralColor }}>
                                  Searchable now. Ask a question and it can be cited immediately.
                                </dd>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <Icons.AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#E88A8A' }} aria-hidden="true" />
                              <div>
                                <dt className="text-sm font-medium">Failed</dt>
                                <dd className="text-sm leading-relaxed" style={{ color: brand.neutralColor }}>
                                  Nothing could be extracted. The row shows the reason; delete it and try again.
                                </dd>
                              </div>
                            </div>
                          </dl>
                          <UI.Button
                            className="nd-focus mt-5"
                            style={{
                              backgroundColor: 'transparent',
                              border: '1px solid ' + BORDER,
                              color: TEXT,
                              borderRadius: brand.radius,
                            }}
                            onClick={() => navigate('knowledge-base')}
                          >
                            <Icons.Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                            Open the knowledge base
                          </UI.Button>
                        </div>
                      </>
                    )}

                    {s.id === 'shared' && (
                      <div
                        className="mt-6 flex gap-3 p-4"
                        style={{
                          backgroundColor: 'rgba(244,162,89,0.08)',
                          border: '1px solid rgba(244,162,89,0.35)',
                          borderRadius: brand.radius,
                        }}
                      >
                        <Icons.AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: brand.accentColor }} aria-hidden="true" />
                        <p className="text-sm leading-relaxed" style={{ color: '#E8D6C2' }}>
                          <span className="font-semibold">Note:</span> deleting a document removes the original
                          file, its chunks and its embeddings at once. There is no recycle bin — if you are not
                          sure, download a copy first.
                        </p>
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}

            {/* FAQ */}
            <section className="mt-14" aria-labelledby="faq-heading">
              <h2 id="faq-heading" className="text-xl font-semibold sm:text-2xl" style={{ fontFamily: brand.fontHeading }}>
                Common questions
              </h2>
              <div className="mt-5 overflow-hidden" style={panelStyle}>
                <ul>
                  {FAQS.map((f, i) => {
                    const on = openFaq === i;
                    return (
                      <li key={f.q} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid ' + BORDER : 'none' }}>
                        <h3>
                          <button
                            type="button"
                            id={'faq-btn-' + i}
                            aria-expanded={on}
                            aria-controls={'faq-panel-' + i}
                            onClick={() => setOpenFaq(on ? null : i)}
                            className="nd-focus flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-[15px] font-medium hover:bg-white/5"
                          >
                            <span>{f.q}</span>
                            {on ? (
                              <Icons.ChevronDown className="h-4 w-4 shrink-0" style={{ color: brand.neutralColor }} aria-hidden="true" />
                            ) : (
                              <Icons.ChevronRight className="h-4 w-4 shrink-0" style={{ color: brand.neutralColor }} aria-hidden="true" />
                            )}
                          </button>
                        </h3>
                        <div id={'faq-panel-' + i} role="region" aria-labelledby={'faq-btn-' + i} hidden={!on}>
                          <p className="px-4 pb-4 text-sm leading-relaxed" style={{ color: '#B9C2CD' }}>
                            {f.a}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            {/* Next steps */}
            <section className="mt-14" aria-labelledby="next-heading">
              <h2 id="next-heading" className="text-xl font-semibold sm:text-2xl" style={{ fontFamily: brand.fontHeading }}>
                Where to next
              </h2>
              <ul className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Ask a question', desc: 'Open a new chat and try the suggestion cards.', route: 'chat', Icon: Icons.Home },
                  { label: 'Knowledge base', desc: 'See what the assistant can already draw on.', route: 'knowledge-base', Icon: Icons.Package },
                  { label: 'API reference', desc: 'The product’s own HTTP endpoints, with examples.', route: 'api-reference', Icon: Icons.FileText },
                ].map(({ label, desc, route, Icon }) => (
                  <li key={route}>
                    <button
                      type="button"
                      onClick={() => navigate(route)}
                      className="nd-focus h-full w-full p-4 text-left transition-colors hover:bg-white/5"
                      style={panelStyle}
                    >
                      <Icon className="h-5 w-5" style={{ color: brand.primaryColor }} aria-hidden="true" />
                      <span className="mt-3 flex items-center gap-1.5 text-[15px] font-medium">
                        {label}
                        <Icons.ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed" style={{ color: brand.neutralColor }}>
                        {desc}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Feedback */}
            <section className="mt-12 p-5" style={panelStyle} aria-labelledby="helpful-heading">
              <h2 id="helpful-heading" className="text-base font-semibold">
                Was this guide useful?
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <UI.Button
                  className="nd-focus"
                  style={{
                    backgroundColor: helpful === 'yes' ? 'rgba(91,156,248,0.18)' : 'transparent',
                    border: '1px solid ' + (helpful === 'yes' ? brand.primaryColor : BORDER),
                    color: TEXT,
                    borderRadius: brand.radius,
                  }}
                  aria-pressed={helpful === 'yes'}
                  onClick={() => setHelpful('yes')}
                >
                  <Icons.Check className="mr-2 h-4 w-4" aria-hidden="true" />
                  Yes
                </UI.Button>
                <UI.Button
                  className="nd-focus"
                  style={{
                    backgroundColor: helpful === 'no' ? 'rgba(91,156,248,0.18)' : 'transparent',
                    border: '1px solid ' + (helpful === 'no' ? brand.primaryColor : BORDER),
                    color: TEXT,
                    borderRadius: brand.radius,
                  }}
                  aria-pressed={helpful === 'no'}
                  onClick={() => setHelpful('no')}
                >
                  <Icons.X className="mr-2 h-4 w-4" aria-hidden="true" />
                  Not really
                </UI.Button>
              </div>
              <p className="mt-4 min-h-[1.25rem] text-sm" role="status" style={{ color: brand.neutralColor }}>
                {helpful === 'yes' && 'Thanks — noted. Your answer is not attached to your name.'}
                {helpful === 'no' &&
                  'Thanks for saying so. Tell your administrator what was missing and this page will be updated.'}
              </p>
            </section>
          </main>
        </div>
      </div>

      {/* Source side panel */}
      {source && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setOpenChip(null)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="source-panel-title"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto shadow-2xl"
            style={{ backgroundColor: SURFACE, borderLeft: '1px solid ' + BORDER }}
          >
            <div
              className="flex items-start justify-between gap-4 px-5 py-4"
              style={{ borderBottom: '1px solid ' + BORDER }}
            >
              <div>
                <p className="text-xs uppercase tracking-[0.14em]" style={{ color: brand.accentColor }}>
                  Source {source.chip}
                </p>
                <h2 id="source-panel-title" className="mt-1 break-all text-base font-semibold">
                  {source.filename}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpenChip(null)}
                aria-label="Close source panel"
                className="nd-focus shrink-0 p-2 hover:bg-white/10"
                style={{ borderRadius: brand.radius, color: TEXT }}
              >
                <Icons.X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 px-5 py-5">
              {!source.available ? (
                <div
                  className="flex gap-3 p-4"
                  style={{
                    backgroundColor: 'rgba(244,162,89,0.08)',
                    border: '1px solid rgba(244,162,89,0.35)',
                    borderRadius: brand.radius,
                  }}
                >
                  <Icons.AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: brand.accentColor }} aria-hidden="true" />
                  <p className="text-sm leading-relaxed" style={{ color: '#E8D6C2' }}>
                    <span className="font-semibold">No longer available.</span> This document was deleted from the
                    knowledge base on {source.deleted_on}. The excerpt below is kept with the answer for reference,
                    but the original file cannot be downloaded.
                  </p>
                </div>
              ) : null}

              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt style={{ color: brand.neutralColor }}>File type</dt>
                  <dd className="text-right font-medium">{source.file_type}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: brand.neutralColor }}>Size</dt>
                  <dd className="text-right font-medium tabular-nums">{source.size}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: brand.neutralColor }}>Uploaded by</dt>
                  <dd className="text-right font-medium">{source.uploaded_by}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt style={{ color: brand.neutralColor }}>Uploaded</dt>
                  <dd className="text-right font-medium">{source.uploaded_at}</dd>
                </div>
              </dl>

              <h3 className="mt-7 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: brand.neutralColor }}>
                Retrieved excerpt
              </h3>
              <blockquote
                className="mt-3 p-4 text-sm leading-relaxed"
                style={{
                  backgroundColor: '#0E1217',
                  borderLeft: '3px solid ' + brand.accentColor,
                  borderRadius: brand.radius,
                  color: '#B9C2CD',
                }}
              >
                {source.excerpt}
              </blockquote>
            </div>

            <div className="px-5 py-4" style={{ borderTop: '1px solid ' + BORDER }}>
              {source.available ? (
                <div className="flex flex-wrap gap-3">
                  <UI.Button
                    className="nd-focus font-medium"
                    style={{ backgroundColor: brand.primaryColor, color: '#0B0F13', borderRadius: brand.radius }}
                    onClick={() => navigate('knowledge-base')}
                  >
                    <Icons.Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    Download original
                  </UI.Button>
                  <UI.Button
                    className="nd-focus"
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid ' + BORDER,
                      color: TEXT,
                      borderRadius: brand.radius,
                    }}
                    onClick={() => setOpenChip(null)}
                  >
                    Close
                  </UI.Button>
                </div>
              ) : (
                <UI.Button
                  className="nd-focus"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid ' + BORDER,
                    color: TEXT,
                    borderRadius: brand.radius,
                  }}
                  onClick={() => setOpenChip(null)}
                >
                  Close
                </UI.Button>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
