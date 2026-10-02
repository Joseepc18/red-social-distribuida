import type { Comment } from "../types/posts";

export const COMMENT_MAX_CHARS = 280;

export interface CommentNode {
  readonly comment: Comment;
  readonly replies: readonly CommentNode[];
}

/**
 * Turns the flat thread from GET /posts/{id}/comentarios into a tree, keeping
 * the server order (oldest first) at every level. A reply whose parent is
 * missing is shown as a top-level comment instead of being lost.
 */
export function buildThread(comments: readonly Comment[]): CommentNode[] {
  const ids = new Set(comments.map((comment) => comment.id));
  const children = new Map<string | null, Comment[]>();
  for (const comment of comments) {
    const parent =
      comment.respondeA && ids.has(comment.respondeA)
        ? comment.respondeA
        : null;
    children.set(parent, [...(children.get(parent) ?? []), comment]);
  }
  const grow = (parent: string | null): CommentNode[] =>
    (children.get(parent) ?? []).map((comment) => ({
      comment,
      replies: grow(comment.id),
    }));
  return grow(null);
}

/** Counts code points, like the backend, so emoji count as one character. */
export function commentLength(text: string): number {
  return [...text.trim()].length;
}
