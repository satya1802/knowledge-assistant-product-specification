import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import GettingStarted from "@/screens/GettingStarted";

describe("GettingStarted", () => {
  it("AC-086: covers asking questions, source chips, uploading and the shared knowledge base", () => {
    render(
      <MemoryRouter>
        <GettingStarted />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Asking a question/i)).toBeInTheDocument();
    expect(screen.getByText(/What the source chips mean/i)).toBeInTheDocument();
    expect(screen.getByText(/Uploading documents/i)).toBeInTheDocument();
    expect(screen.getByText(/shared, open knowledge base/i)).toBeInTheDocument();
    expect(screen.getByText(/signed-in employee may upload, download or delete/i)).toBeInTheDocument();
  });

  it("AC-087: exposes exactly one control that returns to chat", () => {
    render(
      <MemoryRouter>
        <GettingStarted />
      </MemoryRouter>,
    );

    const backControls = screen.getAllByRole("button", { name: /Back to chat/i });
    expect(backControls).toHaveLength(1);
  });
});
