import { useCallback, useEffect, useRef, useState } from "react";
import { posts, POST_PAGE_SIZE } from "../services/posts";
import { errorMessage } from "../lib/api";
import type { Post } from "../types/posts";

export function usePostPages(path: string) {
  const [items, setItems] = useState<readonly Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [more, setMore] = useState(true);
  const nextPage = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError("");
    try {
      const batch = await posts.page(path, nextPage.current, controller.signal);
      if (controller.signal.aborted) return;
      setItems((previous) => {
        const unique = new Map(previous.map((post) => [post.id, post]));
        for (const post of batch) unique.set(post.id, post);
        return [...unique.values()];
      });
      nextPage.current += 1;
      setMore(batch.length === POST_PAGE_SIZE);
    } catch (cause) {
      if (!controller.signal.aborted) setError(errorMessage(cause));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        pending.current = null;
      }
    }
  }, [path]);
  useEffect(() => {
    void load();
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, [load]);
  return { items, loading, error, more, load };
}
