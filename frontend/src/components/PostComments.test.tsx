import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PostComments } from "./PostComments";
import { ApiError } from "../lib/api";
import { posts } from "../services/posts";
import type { Comment } from "../types/posts";

vi.mock("../services/posts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/posts")>()),
  posts: { comments: vi.fn(), comment: vi.fn() },
}));

const listComments = vi.mocked(posts.comments);
const createComment = vi.mocked(posts.comment);
const ana = { id: "u1", username: "ana", nombre: "Ana Torres" };
const carla = { id: "u2", username: "carla", nombre: "Carla Méndez" };
const comment = (
  id: string,
  texto: string,
  autor = ana,
  respondeA: string | null = null,
): Comment => ({
  id,
  texto,
  fecha: "2026-10-02T10:00:00Z",
  autor,
  respondeA,
  respuestas: 0,
});

beforeEach(() => {
  listComments.mockResolvedValue([
    comment("c1", "Yo sí, repasando CAP."),
    comment("c2", "¿Grupo de estudio?", carla, "c1"),
    comment("c3", "Me sumo.", ana, "c2"),
  ]);
});

afterEach(() => {
  vi.resetAllMocks();
});

function renderComments(onCommented = vi.fn()) {
  render(
    <MemoryRouter>
      <PostComments postId="p1" onCommented={onCommented} />
    </MemoryRouter>,
  );
  return onCommented;
}

it("shows direct comments and folds their replies", async () => {
  renderComments();

  expect(await screen.findByText("Yo sí, repasando CAP.")).toBeInTheDocument();
  expect(screen.queryByText("¿Grupo de estudio?")).not.toBeInTheDocument();
  expect(listComments).toHaveBeenCalledWith("p1", expect.any(AbortSignal));
});

it("unfolds each level with Ver N respuestas", async () => {
  renderComments();

  fireEvent.click(
    await screen.findByRole("button", { name: "Ver 1 respuesta" }),
  );
  expect(screen.getByText("¿Grupo de estudio?")).toBeInTheDocument();
  expect(screen.queryByText("Me sumo.")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Ver 1 respuesta" }));
  expect(screen.getByText("Me sumo.")).toBeInTheDocument();

  fireEvent.click(
    screen.getAllByRole("button", { name: "Ocultar respuestas" })[0],
  );
  expect(screen.queryByText("¿Grupo de estudio?")).not.toBeInTheDocument();
});

it("links the author name and avatar to the profile", async () => {
  renderComments();

  const name = await screen.findByRole("link", { name: "Ana Torres" });

  expect(name).toHaveAttribute("href", "/usuarios/u1");
});

it("adds a new comment without reloading and reports it", async () => {
  createComment.mockResolvedValue(comment("c9", "Nuevo comentario", carla));
  const onCommented = renderComments();
  await screen.findByText("Yo sí, repasando CAP.");

  fireEvent.change(screen.getByLabelText("Texto del comentario"), {
    target: { value: "  Nuevo comentario  " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Comentar" }));

  expect(
    await screen.findByText("Nuevo comentario", { selector: "p" }),
  ).toBeInTheDocument();
  expect(createComment).toHaveBeenCalledWith(
    "p1",
    "  Nuevo comentario  ",
    null,
  );
  expect(screen.getByLabelText("Texto del comentario")).toHaveValue("");
  expect(onCommented).toHaveBeenCalledTimes(1);
  expect(listComments).toHaveBeenCalledTimes(1);
});

it("replies to a comment and unfolds its thread", async () => {
  createComment.mockResolvedValue(
    comment("c9", "Respuesta nueva", carla, "c1"),
  );
  const onCommented = renderComments();
  const first = (await screen.findByText("Yo sí, repasando CAP.")).closest(
    "article",
  )!;

  fireEvent.click(within(first).getByRole("button", { name: "Responder" }));
  fireEvent.change(screen.getByLabelText("Respuesta a Ana Torres"), {
    target: { value: "Respuesta nueva" },
  });
  fireEvent.submit(
    screen.getByLabelText("Respuesta a Ana Torres").closest("form")!,
  );

  expect(
    await screen.findByText("Respuesta nueva", { selector: "p" }),
  ).toBeInTheDocument();
  expect(createComment).toHaveBeenCalledWith("p1", "Respuesta nueva", "c1");
  expect(screen.getByText("¿Grupo de estudio?")).toBeInTheDocument();
  expect(
    screen.queryByLabelText("Respuesta a Ana Torres"),
  ).not.toBeInTheDocument();
  expect(onCommented).toHaveBeenCalledTimes(1);
});

it("shows the server message and keeps the draft when sending fails", async () => {
  createComment.mockRejectedValue(
    new ApiError(404, {
      error: "POST_NO_ENCONTRADO",
      mensaje: "La publicación no existe",
    }),
  );
  const onCommented = renderComments();
  await screen.findByText("Yo sí, repasando CAP.");

  fireEvent.change(screen.getByLabelText("Texto del comentario"), {
    target: { value: "Hola" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Comentar" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "La publicación no existe",
  );
  expect(screen.getByLabelText("Texto del comentario")).toHaveValue("Hola");
  expect(onCommented).not.toHaveBeenCalled();
});

it("counts up to 280 characters and blocks longer comments", async () => {
  renderComments();
  const field = await screen.findByLabelText("Texto del comentario");

  expect(screen.queryByText(/\/ 280/)).not.toBeInTheDocument();
  fireEvent.change(field, { target: { value: "a".repeat(281) } });

  expect(field).toHaveAccessibleDescription("281 / 280");
  expect(screen.getByRole("button", { name: "Comentar" })).toBeDisabled();
});

it("invites to comment when there are none", async () => {
  listComments.mockResolvedValue([]);
  renderComments();

  expect(
    await screen.findByText(/Todavía no hay comentarios/),
  ).toBeInTheDocument();
});
