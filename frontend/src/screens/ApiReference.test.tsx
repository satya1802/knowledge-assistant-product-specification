import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import ApiReference from "@/screens/ApiReference";

describe("ApiReference", () => {
  it("AC-088: lists the live contract's auth, document, chat and conversation routes", () => {
    render(
      <MemoryRouter>
        <ApiReference />
      </MemoryRouter>,
    );

    const authPaths = [
      "/api/auth/register",
      "/api/auth/login",
      "/api/auth/logout",
      "/api/auth/me",
      "/api/auth/change-password",
    ];
    const documentPaths = [
      "/api/documents",
      "/api/documents/stream",
      "/api/documents/{document_id}/download",
      "/api/documents/{document_id}",
    ];
    const chatPaths = ["/api/chat", "/api/chat/{message_id}/regenerate"];
    const conversationPaths = [
      "/api/conversations",
      "/api/conversations/{conversation_id}",
    ];
    const docsPaths = ["/api/docs/getting-started", "/api/docs/api-reference"];

    for (const path of [
      ...authPaths,
      ...documentPaths,
      ...chatPaths,
      ...conversationPaths,
      ...docsPaths,
    ]) {
      expect(screen.getAllByText(path).length).toBeGreaterThan(0);
    }
  });

  it("AC-089: no credential-looking value appears anywhere on the page", () => {
    const { container } = render(
      <MemoryRouter>
        <ApiReference />
      </MemoryRouter>,
    );

    const text = container.textContent ?? "";
    expect(text).not.toMatch(/AIza[0-9A-Za-z_-]{10,}/);
    expect(text).not.toMatch(/sk-[0-9A-Za-z]{10,}/);
    expect(text).not.toMatch(/gemini[-_ ]?api[-_ ]?key/i);
  });
});
