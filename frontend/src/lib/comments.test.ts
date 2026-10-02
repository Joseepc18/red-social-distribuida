import { expect, it } from "vitest";
import { buildThread, commentLength, type CommentNode } from "./comments";
import type { Comment } from "../types/posts";

const author = { id: "u1", username: "ana", nombre: "Ana Torres" };
const comment = (id: string, respondeA: string | null = null): Comment => ({
  id,
  texto: "Comentario " + id,
  fecha: "2026-10-02T10:00:00Z",
  autor: author,
  respondeA,
  respuestas: 0,
});
const ids = (nodes: readonly CommentNode[]): unknown =>
  nodes.map((node) => [node.comment.id, ids(node.replies)]);

it("nests replies under their parent at every level, keeping the order", () => {
  const thread = buildThread([
    comment("a"),
    comment("a1", "a"),
    comment("a1x", "a1"),
    comment("b"),
    comment("a2", "a"),
  ]);

  expect(ids(thread)).toEqual([
    [
      "a",
      [
        ["a1", [["a1x", []]]],
        ["a2", []],
      ],
    ],
    ["b", []],
  ]);
});

it("keeps a reply whose parent is missing as a top-level comment", () => {
  expect(ids(buildThread([comment("x", "gone")]))).toEqual([["x", []]]);
});

it("returns an empty thread for no comments", () => {
  expect(buildThread([])).toEqual([]);
});

it("counts characters like the backend", () => {
  expect(commentLength("  hola  ")).toBe(4);
  expect(commentLength("😀😀")).toBe(2);
});
