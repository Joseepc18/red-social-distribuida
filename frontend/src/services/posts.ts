import { api } from "../lib/api";
import type { Comment, Post } from "../types/posts";

export const POST_PAGE_SIZE = 20;
export const posts = {
  page: <T extends Post = Post>(
    path: string,
    page: number,
    signal: AbortSignal,
  ) => api<readonly T[]>(path + "?page=" + page, { signal }),
  find: (id: string, signal: AbortSignal) =>
    api<Post>("/posts/" + encodeURIComponent(id), { signal }),
  discover: (signal: AbortSignal) =>
    api<readonly DiscoveredPost[]>("/descubrir", { signal }),
  create: (text: string, file: File | undefined, signal: AbortSignal) => {
    const body = new FormData();
    body.set("texto", text.trim());
    if (file) body.set("archivo", file);
    return api<Post>("/posts", { method: "POST", body, signal });
  },
  setReaction: (id: string, reacted: boolean) =>
    api<void>("/posts/" + encodeURIComponent(id) + "/reacciones", {
      method: reacted ? "DELETE" : "POST",
    }),
  comments: (id: string, signal: AbortSignal) =>
    api<readonly Comment[]>(
      "/posts/" + encodeURIComponent(id) + "/comentarios",
      { signal },
    ),
  comment: (id: string, text: string, replyTo: string | null) =>
    api<Comment>("/posts/" + encodeURIComponent(id) + "/comentarios", {
      method: "POST",
      body: JSON.stringify({ texto: text.trim(), respondeA: replyTo }),
    }),
};

export interface DiscoveredPost extends Post {
  readonly amigosQueReaccionaron: number;
}

export function postImagePath(post: Post): string | undefined {
  if (!post.mediaKey) return undefined;
  // Keep images behind the same-origin /media proxy.
  const segments = post.mediaKey.split("/");
  if (segments.some((part) => !part || part === "." || part === ".."))
    return undefined;
  return "/media/" + segments.map(encodeURIComponent).join("/");
}
