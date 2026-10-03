import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AppLayout } from "./AppLayout";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    session: {
      token: "test-token",
      user: { id: "ana-id", nombre: "Ana Torres", username: "ana" },
    },
  }),
}));

vi.mock("../context/ChatProvider", () => ({
  ChatProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("../context/chat-context", () => ({
  useChat: () => ({ unread: {} }),
}));

vi.mock("./AnimatedBrandMark", () => ({
  AnimatedBrandMark: () => (
    <a href="/" aria-label="ZENIT">
      ZENIT
    </a>
  ),
}));
vi.mock("./Icon", () => ({ Icon: () => null }));
vi.mock("./AccountMenu", () => ({ AccountMenu: () => null }));
vi.mock("./PushNotifications", () => ({ PushNotifications: () => null }));
vi.mock("./ChatDock", () => ({ ChatDock: () => null }));

describe("AppLayout navigation", () => {
  it("keeps Amigos active in desktop and mobile navigation on suggestions", () => {
    render(
      <MemoryRouter initialEntries={["/sugerencias"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/sugerencias" element={<div>Sugerencias</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const friendsLinks = screen.getAllByRole("link", { name: "Amigos" });

    expect(friendsLinks).toHaveLength(2);
    expect(friendsLinks[0]).toHaveClass("nav-active");
    expect(friendsLinks[1]).toHaveClass("mobile-active");
  });
});
