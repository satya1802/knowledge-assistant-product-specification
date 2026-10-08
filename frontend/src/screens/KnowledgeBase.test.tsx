import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/App";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    clone() {
      return this;
    },
  };
}

const SIGNED_IN_USER = {
  id: "usr_01",
  name: "Satya Ganaraju",
  email: "satya.ganaraju@quorq.ai",
  is_admin: true,
  is_enabled: true,
};

const DOC_READY = {
  id: "doc_1",
  filename: "Employee-Handbook.pdf",
  file_type: "pdf",
  size_bytes: 2048,
  status: "ready",
  failure_reason: null,
  uploaded_by: "Priya Raman",
  uploaded_at: "2026-10-07T09:14:00",
  chunk_count: 12,
};

const DOC_FAILED = {
  id: "doc_2",
  filename: "Vendor-Agreement.docx",
  file_type: "docx",
  size_bytes: 4096,
  status: "failed",
  failure_reason: "Password-protected file",
  uploaded_by: "Dana Okoro",
  uploaded_at: "2026-10-06T10:00:00",
  chunk_count: 0,
};

function documentsListResponse(documents: Array<{ status: string }> = [DOC_READY, DOC_FAILED]) {
  const total = documents.length;
  return {
    documents,
    stats: {
      total,
      ready: documents.filter((d) => d.status === "ready").length,
      processing: documents.filter((d) => d.status === "processing").length,
      failed: documents.filter((d) => d.status === "failed").length,
    },
    result_count: total,
    max_upload_bytes: 25 * 1024 * 1024,
  };
}

// --- Fake EventSource (jsdom has none) ------------------------------------

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  listeners: Record<string, Array<(e: { data: string }) => void>> = {};
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  url: string;
  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, cb: (e: { data: string }) => void) {
    (this.listeners[type] ||= []).push(cb);
  }
  removeEventListener(type: string, cb: (e: { data: string }) => void) {
    this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== cb);
  }
  close() {}
  emit(type: string, data: unknown) {
    const payload = { data: JSON.stringify(data) };
    (this.listeners[type] || []).forEach((cb) => cb(payload));
  }
}

// --- Fake XMLHttpRequest for upload progress ------------------------------

class FakeXHR {
  static instances: FakeXHR[] = [];
  upload: {
    onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null;
  } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  status = 0;
  responseText = "";
  withCredentials = false;
  url = "";
  open(_method: string, url: string) {
    this.url = url;
  }
  send() {
    FakeXHR.instances.push(this);
  }
  respond(status: number, body: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(body);
    this.onload?.();
  }
}

function makeFile(name: string, size: number, type = "application/pdf") {
  const file = new File([new Uint8Array(Math.min(size, 64))], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function stubFetch(handlers: Record<string, unknown> = {}) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/api/auth/me")) {
      return Promise.resolve(
        jsonResponse(200, { user: SIGNED_IN_USER, self_registration_enabled: true }),
      );
    }
    const key = Object.keys(handlers)
      .filter((k) => url.includes(k))
      .sort((a, b) => b.length - a.length)[0];
    if (key) {
      const h = handlers[key] as { status: number; body?: unknown; blob?: Blob };
      if (h.blob) {
        return Promise.resolve({
          ok: h.status >= 200 && h.status < 300,
          status: h.status,
          blob: async () => h.blob,
          json: async () => h.body ?? {},
          clone() {
            return this;
          },
        });
      }
      return Promise.resolve(jsonResponse(h.status, h.body));
    }
    return Promise.resolve(jsonResponse(404, { detail: "not found" }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function renderKnowledgeBase(handlers: Record<string, unknown> = {}) {
  const fetchMock = stubFetch(handlers);
  render(
    <MemoryRouter initialEntries={["/knowledge-base"]}>
      <App />
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.getByText("Knowledge base")).toBeInTheDocument());
  return fetchMock;
}

describe("KnowledgeBase", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    FakeXHR.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource as unknown as typeof EventSource);
    vi.stubGlobal("XMLHttpRequest", FakeXHR as unknown as typeof XMLHttpRequest);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads documents and stats from GET /api/documents, no seeded data", async () => {
    await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse() },
    });

    await waitFor(() => expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument());
    expect(screen.getByText("Vendor-Agreement.docx")).toBeInTheDocument();
    expect(screen.getByText("Password-protected file")).toBeInTheDocument();
    expect(screen.getByText("Priya Raman")).toBeInTheDocument();

    const statsSection = screen.getByText("Total documents").closest("div")!.parentElement!;
    expect(within(statsSection).getByText("2")).toBeInTheDocument();
  });

  it("shows an empty-state invitation when the library has no documents", async () => {
    await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse([]) },
    });

    await waitFor(() =>
      expect(screen.getByText("The knowledge base is empty")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /Upload a document/ })).toBeInTheDocument();
  });

  it("AC-029: search narrows the table by file name, case-insensitively, and shows the count", async () => {
    await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse() },
    });
    await waitFor(() => expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Search by file name"), "VENDOR");

    expect(screen.queryByText("Employee-Handbook.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("Vendor-Agreement.docx")).toBeInTheDocument();
    expect(screen.getByText(/Showing 1 of 2 document/)).toBeInTheDocument();
  });

  it("AC-030/AC-031: status and type filters combine with search, and a no-match clears", async () => {
    await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse() },
    });
    await waitFor(() => expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument());

    await userEvent.selectOptions(screen.getByLabelText("Status"), "failed");
    expect(screen.queryByText("Employee-Handbook.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("Vendor-Agreement.docx")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("File type"), "pdf");
    await waitFor(() => expect(screen.getByText("No matching documents")).toBeInTheDocument());

    const clearButtons = screen.getAllByRole("button", { name: /Clear search and filters/ });
    await userEvent.click(clearButtons[clearButtons.length - 1]);
    await waitFor(() => expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument());
  });

  it("AC-018: rejects an unsupported file type with a message naming the supported types", async () => {
    await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse([]) },
    });
    await waitFor(() =>
      expect(screen.getByText("The knowledge base is empty")).toBeInTheDocument(),
    );

    const dropzone = screen.getByText(/Drag files here/).closest("div")!;
    const badFile = makeFile("archive.zip", 1000, "application/zip");
    fireEvent.drop(dropzone, { dataTransfer: { files: [badFile] } });

    await waitFor(() =>
      expect(
        screen.getByText(/Supported types are PDF, DOCX, TXT and Markdown/),
      ).toBeInTheDocument(),
    );
    expect(FakeXHR.instances.length).toBe(0);
  });

  it("AC-019: rejects a file over the server-reported max size before upload begins", async () => {
    await renderKnowledgeBase({
      "/api/documents": {
        status: 200,
        body: { ...documentsListResponse([]), max_upload_bytes: 1024 },
      },
    });
    await waitFor(() =>
      expect(screen.getByText("The knowledge base is empty")).toBeInTheDocument(),
    );

    const dropzone = screen.getByText(/Drag files here/).closest("div")!;
    const bigFile = makeFile("big.pdf", 5000);
    fireEvent.drop(dropzone, { dataTransfer: { files: [bigFile] } });

    await waitFor(() => expect(screen.getByText(/exceeds the 1 KB limit/)).toBeInTheDocument());
    expect(FakeXHR.instances.length).toBe(0);
  });

  it("AC-017: a valid upload appears immediately as Processing with live progress, then settles", async () => {
    await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse([]) },
    });
    await waitFor(() =>
      expect(screen.getByText("The knowledge base is empty")).toBeInTheDocument(),
    );

    const dropzone = screen.getByText(/Drag files here/).closest("div")!;
    const goodFile = makeFile("notes.txt", 500, "text/plain");
    fireEvent.drop(dropzone, { dataTransfer: { files: [goodFile] } });

    await waitFor(() => expect(screen.getByText("notes.txt")).toBeInTheDocument());
    expect(screen.getAllByText("Processing").length).toBeGreaterThan(0);

    const xhr = FakeXHR.instances[0];
    act(() => {
      xhr.upload.onprogress!({ lengthComputable: true, loaded: 50, total: 100 });
    });
    await waitFor(() => expect(screen.getByText("50% uploaded")).toBeInTheDocument());

    act(() => {
      xhr.respond(201, {
        accepted: [
          {
            id: "doc_new",
            filename: "notes.txt",
            file_type: "txt",
            size_bytes: 500,
            status: "processing",
            failure_reason: null,
            uploaded_by: SIGNED_IN_USER.name,
            uploaded_at: new Date().toISOString(),
            chunk_count: 0,
          },
        ],
        rejected: [],
      });
    });

    await waitFor(() => expect(screen.queryByText("50% uploaded")).not.toBeInTheDocument());
  });

  it("AC-027: an SSE event updates the row and stats with no reload, including failure reason", async () => {
    const processingDoc = { ...DOC_READY, id: "doc_3", status: "processing", chunk_count: 0 };
    await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse([processingDoc]) },
    });
    await waitFor(() => expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument());

    const source = FakeEventSource.instances[0];
    act(() => {
      source.emit("document.status", {
        id: "doc_3",
        status: "failed",
        failure_reason: "No extractable text found",
      });
    });

    await waitFor(() => expect(screen.getByText("No extractable text found")).toBeInTheDocument());
  });

  it("delete calls DELETE /api/documents/{id} and removes the row", async () => {
    await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse([DOC_READY]) },
      "/api/documents/doc_1": { status: 204, body: undefined },
    });
    await waitFor(() => expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText("Delete Employee-Handbook.pdf"));
    await userEvent.click(screen.getByRole("button", { name: /Delete permanently/ }));

    await waitFor(() =>
      expect(screen.queryByText("Employee-Handbook.pdf")).not.toBeInTheDocument(),
    );
  });

  it("AC-034: delete is offered for a document uploaded by someone else, and the dialog names it and warns it is permanent", async () => {
    await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse([DOC_READY]) },
    });
    await waitFor(() => expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText("Delete Employee-Handbook.pdf"));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Employee-Handbook\.pdf/)).toBeInTheDocument();
    expect(within(dialog).getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it("AC-037: cancel closes the dialog, sends no request, and the document remains Ready", async () => {
    const fetchMock = await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse([DOC_READY]) },
    });
    await waitFor(() => expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText("Delete Employee-Handbook.pdf"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const callsBefore = fetchMock.mock.calls.length;
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
  });

  it("the confirmation dialog is dismissable with Escape", async () => {
    await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse([DOC_READY]) },
    });
    await waitFor(() => expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText("Delete Employee-Handbook.pdf"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("AC-035: on confirm, stats update live without a manual refresh", async () => {
    await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse([DOC_READY, DOC_FAILED]) },
      "/api/documents/doc_1": { status: 204, body: undefined },
    });
    await waitFor(() => expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument());

    const statsSectionBefore = screen.getByText("Total documents").closest("div")!.parentElement!;
    expect(within(statsSectionBefore).getByText("2")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Delete Employee-Handbook.pdf"));
    await userEvent.click(screen.getByRole("button", { name: /Delete permanently/ }));

    await waitFor(() =>
      expect(screen.queryByText("Employee-Handbook.pdf")).not.toBeInTheDocument(),
    );
    const totalCardAfter = screen.getByText("Total documents").closest("div")!;
    expect(within(totalCardAfter).getByText("1")).toBeInTheDocument();
  });

  it("a failed delete shows the server's own detail text inline, and the row remains", async () => {
    await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse([DOC_READY]) },
      "/api/documents/doc_1": {
        status: 400,
        body: { detail: "Document is referenced by an active chat." },
      },
    });
    await waitFor(() => expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText("Delete Employee-Handbook.pdf"));
    await userEvent.click(screen.getByRole("button", { name: /Delete permanently/ }));

    await waitFor(() =>
      expect(screen.getByText("Document is referenced by an active chat.")).toBeInTheDocument(),
    );
    expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument();
  });

  it("a 401 on delete routes the user to sign-in", async () => {
    await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse([DOC_READY]) },
      "/api/documents/doc_1": { status: 401, body: { detail: "Session expired." } },
    });
    await waitFor(() => expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText("Delete Employee-Handbook.pdf"));
    await userEvent.click(screen.getByRole("button", { name: /Delete permanently/ }));

    await waitFor(() => expect(screen.getByLabelText("Email address")).toBeInTheDocument());
  });

  it("AC-032: download calls downloadDocument with credentials and saves the file under its original name", async () => {
    const blob = new Blob(["file-contents"], { type: "application/pdf" });
    const fetchMock = await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse([DOC_READY]) },
      "/api/documents/doc_1/download": { status: 200, blob },
    });
    await waitFor(() => expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument());

    const createObjectURL = vi.fn().mockReturnValue("blob:fake-url");
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    let capturedDownloadName = "";
    const appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
      capturedDownloadName = (node as HTMLAnchorElement).download;
      return node;
    });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await userEvent.click(screen.getByLabelText("Download Employee-Handbook.pdf"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/documents/doc_1/download"),
        expect.objectContaining({ credentials: "include" }),
      ),
    );
    expect(createObjectURL).toHaveBeenCalled();
    expect(capturedDownloadName).toBe("Employee-Handbook.pdf");

    appendSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it("a failed download shows the server's own detail text inline", async () => {
    await renderKnowledgeBase({
      "/api/documents": { status: 200, body: documentsListResponse([DOC_READY]) },
      "/api/documents/doc_1/download": {
        status: 404,
        body: { detail: "The original file is no longer available." },
      },
    });
    await waitFor(() => expect(screen.getByText("Employee-Handbook.pdf")).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText("Download Employee-Handbook.pdf"));

    await waitFor(() =>
      expect(screen.getByText("The original file is no longer available.")).toBeInTheDocument(),
    );
  });
});
