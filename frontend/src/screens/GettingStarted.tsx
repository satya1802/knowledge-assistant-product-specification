import * as React from "react";

import * as UI from "@/lib/ui";
import { Icons } from "@/lib/icons";
import { brand } from "@/lib/brand";
import { useNavigate } from "@/lib/navigate";

interface Section {
  id: string;
  title: string;
  icon: string;
  summary: string;
  points: string[];
}

const SECTIONS: Section[] = [
  {
    id: "ask",
    title: "Asking a question",
    icon: "Search",
    summary:
      "Type a question the way you would ask a colleague. Every question is searched against " +
      "the shared knowledge base before the assistant writes an answer.",
    points: [
      "Press Enter to send, Shift + Enter for a new line.",
      'Be specific: "What is the notice period in the UK contract template?" finds more than ' +
        '"notice period".',
      "Follow-up questions keep their place in the same conversation.",
      "Starting a new chat begins with a clean slate — nothing from a previous conversation carries over.",
    ],
  },
  {
    id: "sources",
    title: "What the source chips mean",
    icon: "FileText",
    summary:
      "Numbered chips under an answer point to the document each statement was drawn from.",
    points: [
      "A chip's number matches the bracketed reference in the answer text, so [2] in a " +
        "sentence is chip 2 below it.",
      "Clicking a chip shows the exact excerpt that was used, along with the file name, type " +
        "and who uploaded it.",
      'An answer labelled "General knowledge" has no chips: nothing in the library was ' +
        "relevant enough, so treat it like any general answer.",
      "If the source document has since been deleted, the chip says so rather than failing silently.",
    ],
  },
  {
    id: "uploads",
    title: "Uploading documents",
    icon: "Upload",
    summary:
      "Add PDF, Word, plain text or Markdown files from the Knowledge base page so the " +
      "assistant can cite them.",
    points: [
      "Drag files onto the dropzone on the Knowledge base page, or choose them from your computer.",
      "A file shows as Processing while it is parsed and indexed, then flips to Ready on its own.",
      "Failed uploads show a short reason, such as a password-protected PDF or a scanned page " +
        "with no text layer.",
      "Only text content is indexed; images and charts inside a file are not read.",
    ],
  },
  {
    id: "shared",
    title: "One shared, open knowledge base",
    icon: "Users",
    summary:
      "There is a single company-wide library. Everything any signed-in employee uploads is " +
      "answerable by everyone else, and administrators have no extra document rights.",
    points: [
      "Any signed-in employee may upload, download or delete any document, whoever added it.",
      "Deletion is permanent: there is no recycle bin, so you are always asked to confirm first.",
      "Your conversations, by contrast, stay private to your own account — nobody else can read them.",
    ],
  },
];

export default function GettingStarted() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-full w-full overflow-x-hidden"
      style={{
        backgroundColor: brand.backgroundColor,
        color: "#E2E8F0",
        fontFamily: brand.fontBody,
      }}
    >
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <UI.Button
            onClick={() => navigate("chat")}
            style={{
              backgroundColor: brand.primaryColor,
              color: "#0B0F13",
              borderRadius: brand.radius,
            }}
          >
            <Icons.ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to chat
          </UI.Button>
        </div>

        <header className="mb-8">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: brand.neutralColor }}
          >
            Help
          </p>
          <h1
            className="mt-2 break-words text-2xl font-semibold sm:text-3xl"
            style={{ fontFamily: brand.fontHeading }}
          >
            Getting started with Knowledge Assistant
          </h1>
          <p
            className="mt-3 break-words text-sm leading-relaxed sm:text-base"
            style={{ color: "#B9C2CD" }}
          >
            How to ask a question, read the source chips under an answer, add documents to the
            shared library, and who can see what.
          </p>
        </header>

        <div className="space-y-10">
          {SECTIONS.map((section) => {
            const Icon = Icons[section.icon];
            return (
              <section key={section.id} aria-labelledby={`gs-h-${section.id}`}>
                <div className="flex items-center gap-2">
                  {Icon && (
                    <Icon
                      className="h-5 w-5 shrink-0"
                      style={{ color: brand.primaryColor }}
                      aria-hidden="true"
                    />
                  )}
                  <h2
                    id={`gs-h-${section.id}`}
                    className="break-words text-lg font-semibold sm:text-xl"
                    style={{ fontFamily: brand.fontHeading }}
                  >
                    {section.title}
                  </h2>
                </div>
                <p
                  className="mt-3 break-words text-sm leading-relaxed sm:text-base"
                  style={{ color: "#B9C2CD" }}
                >
                  {section.summary}
                </p>
                <ul className="mt-4 space-y-2">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-2 break-words text-sm leading-relaxed">
                      <Icons.Check
                        className="mt-1 h-4 w-4 shrink-0"
                        style={{ color: brand.primaryColor }}
                        aria-hidden="true"
                      />
                      <span>{point}</span>
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
