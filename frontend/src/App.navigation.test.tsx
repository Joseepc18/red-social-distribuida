import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { WhoToFollow } from "./components/WhoToFollow";

vi.mock("./components/AppLayout", async () => {
  const { Outlet } = await import("react-router");
  return { AppLayout: () => <Outlet /> };
});

vi.mock("./components/ProtectedRoute", async () => {
  const { Outlet } = await import("react-router");
  return { ProtectedRoute: () => <Outlet /> };
});

vi.mock("./hooks/useAuth", () => ({
  useAuth: () => ({
    session: {
      token: "test-token",
      user: { id: "ana-id", nombre: "Ana Torres", username: "ana" },
    },
    validatedToken: "test-token",
  }),
}));

vi.mock("./hooks/useRemote", () => ({
  useRemote: (key: string) => ({
    data: key.startsWith("people:")
      ? { friends: [], followers: [], following: [] }
      : [],
    error: undefined,
    loading: false,
    reload: vi.fn(),
  }),
}));

vi.mock("./hooks/useSuggestions", () => ({
  useSuggestions: () => ({
    data: [],
    error: undefined,
    loading: false,
    reload: vi.fn(),
    follow: vi.fn(),
    busyId: null,
    mutationError: "",
    notice: "",
  }),
}));

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("navigation for friends and suggestions", () => {
  it("renders the private suggestions route with both network sections", () => {
    renderApp("/sugerencias");

    expect(
      screen.getByRole("heading", { level: 1, name: "Sugerencias" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Personas que podrías conocer",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Hasta dónde llega tu red",
      }),
    ).toBeInTheDocument();
  });

  it("keeps Amigos focused on its lists and links to the suggestions page", () => {
    renderApp("/explorar");

    expect(
      screen.getByRole("heading", { level: 1, name: "Amigos" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Sugerencias" })).toHaveAttribute(
      "href",
      "/sugerencias",
    );
    expect(
      screen.queryByRole("heading", {
        name: "Personas que podrías conocer",
      }),
    ).not.toBeInTheDocument();
  });

  it("links Inicio suggestions to the new page and omits the community card", () => {
    render(
      <MemoryRouter>
        <WhoToFollow onFollow={vi.fn()} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "Ver todas las sugerencias" }),
    ).toHaveAttribute("href", "/sugerencias");
    expect(screen.queryByText("Amplía tu red")).not.toBeInTheDocument();
  });
});
