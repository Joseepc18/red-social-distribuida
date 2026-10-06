import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { ChatContext, type ChatState } from "../context/chat-context";
import { ChatDock } from "./ChatDock";

function LocationPath() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function ChatDockHarness() {
  const [dockOpen, setDockOpen] = useState(true);
  const state: ChatState = {
    conversations: [],
    loading: false,
    reload: vi.fn(),
    histories: {},
    drafts: {},
    unread: {},
    status: "connected",
    serverError: "",
    floatingId: null,
    dockOpen,
    setDockOpen,
    openConversation: vi.fn(),
    showList: vi.fn(),
    loadHistory: vi.fn(async () => undefined),
    markRead: vi.fn(),
    setVisible: vi.fn(),
    setDraft: vi.fn(),
    send: vi.fn(() => true),
  };

  return (
    <MemoryRouter initialEntries={["/feed"]}>
      <ChatContext.Provider value={state}>
        <LocationPath />
        <ChatDock />
      </ChatContext.Provider>
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

it("opens Amigos and closes the floating panel from its empty state", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  render(<ChatDockHarness />);

  expect(screen.getByRole("dialog", { name: "Mensajes" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "Buscar amigos" }));

  expect(screen.getByTestId("location")).toHaveTextContent("/explorar");
  expect(screen.queryByRole("dialog", { name: "Mensajes" })).toBeNull();
  expect(
    screen.getByRole("button", { name: "Abrir mensajes" }),
  ).toHaveAttribute("aria-expanded", "false");
});
