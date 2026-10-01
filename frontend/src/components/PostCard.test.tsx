import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { PostCard } from "./PostCard";
import { posts } from "../services/posts";
import type { Post } from "../types/posts";

vi.mock("../services/posts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/posts")>()),
  posts: { setReaction: vi.fn().mockResolvedValue(undefined) },
}));

const post: Post = {
  id: "p1",
  texto: "Avance del proyecto",
  fecha: "2026-09-30T19:27:00Z",
  autor: { id: "u2", username: "carla", nombre: "Carla Méndez" },
  mediaKey: null,
  mediaTipo: null,
  mediaUrl: null,
  reacciones: 1,
  reaccionado: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

function renderCard(value: Post = post, detail = false) {
  render(
    <MemoryRouter initialEntries={["/feed"]}>
      <Routes>
        <Route
          path="/feed"
          element={<PostCard post={value} detail={detail} />}
        />
        <Route path="/posts/:id" element={<p>Detalle abierto</p>} />
        <Route path="/usuarios/:id" element={<p>Perfil abierto</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

it("opens the post when the card is clicked", () => {
  renderCard();

  fireEvent.click(screen.getByText("Avance del proyecto"));

  expect(screen.getByText("Detalle abierto")).toBeInTheDocument();
});

it("links the date to the post for keyboard users", () => {
  renderCard();

  expect(screen.getByRole("link", { name: /2026/ })).toHaveAttribute(
    "href",
    "/posts/p1",
  );
});

it("opens the profile from the avatar, not the post", () => {
  renderCard();

  fireEvent.click(screen.getByText("CM"));

  expect(screen.getByText("Perfil abierto")).toBeInTheDocument();
});

it("reacts without opening the post", () => {
  renderCard();

  fireEvent.click(screen.getByRole("button", { name: /Me gusta/ }));

  expect(posts.setReaction).toHaveBeenCalledWith("p1", false);
  expect(screen.queryByText("Detalle abierto")).not.toBeInTheDocument();
});

it("does not open the post while text is selected", () => {
  vi.spyOn(window, "getSelection").mockReturnValue({
    toString: () => "Avance",
  } as Selection);
  renderCard();

  fireEvent.click(screen.getByText("Avance del proyecto"));

  expect(screen.queryByText("Detalle abierto")).not.toBeInTheDocument();
});

it("shortens long texts and expands them in place", () => {
  const long = "palabra ".repeat(60) + "final";
  renderCard({ ...post, texto: long });

  expect(screen.queryByText(/final/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Mostrar más" }));

  expect(screen.getByText(/final/)).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Mostrar más" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Detalle abierto")).not.toBeInTheDocument();
});

it("shows the whole text and stays put on the detail page", () => {
  const long = "palabra ".repeat(60) + "final";
  renderCard({ ...post, texto: long }, true);

  fireEvent.click(screen.getByText(/final/));

  expect(
    screen.queryByRole("button", { name: "Mostrar más" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Detalle abierto")).not.toBeInTheDocument();
});

it("moves keyboard focus to the expanded text", () => {
  renderCard({ ...post, texto: "palabra ".repeat(60) + "final" });

  fireEvent.click(screen.getByRole("button", { name: "Mostrar más" }));

  expect(screen.getByText(/final/)).toHaveFocus();
});

it("opens the post in a new tab with Ctrl or Cmd + click", () => {
  const open = vi.spyOn(window, "open").mockReturnValue(null);
  renderCard();

  fireEvent.click(screen.getByText("Avance del proyecto"), { ctrlKey: true });
  fireEvent.click(screen.getByText("Avance del proyecto"), { metaKey: true });

  expect(open).toHaveBeenCalledTimes(2);
  expect(open).toHaveBeenCalledWith("/posts/p1", "_blank", "noopener");
  expect(screen.queryByText("Detalle abierto")).not.toBeInTheDocument();
});
