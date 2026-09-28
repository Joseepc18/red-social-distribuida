import { api } from "../lib/api";
import type { Post } from "../types/posts";

export const POST_PAGE_SIZE = 20;
export const posts = {
  page: (path: string, page: number, signal: AbortSignal) =>
    api<readonly Post[]>(path + "?page=" + page, { signal }),
  find: (id: string, signal: AbortSignal) =>
    api<Post>("/posts/" + encodeURIComponent(id), { signal }),
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
};

export function postImagePath(post: Post): string | undefined {
  if (!post.mediaKey) return undefined;
  // Keep images behind the same-origin /media proxy.
  const segments = post.mediaKey.split("/");
  if (segments.some((part) => !part || part === "." || part === ".."))
    return undefined;
  return "/media/" + segments.map(encodeURIComponent).join("/");
}
