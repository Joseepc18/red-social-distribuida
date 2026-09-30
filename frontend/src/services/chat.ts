import { api, ApiError } from "../lib/api";
import type { Conversation, MessagePage } from "../types/chat";

function waitForRetry(delay: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    function abort() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("Aborted", "AbortError"));
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, delay);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}

async function history(id: string, antes: string | null, signal?: AbortSignal) {
  const query = antes ? "?antes=" + encodeURIComponent(antes) : "";
  // A socket may reconnect before Nginx finishes marking a failed peer down.
  // Retry only this idempotent read, never a message or conversation creation.
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    try {
      return await api<MessagePage>(
        "/conversaciones/" + encodeURIComponent(id) + "/mensajes" + query,
        { signal },
      );
    } catch (error) {
      if (
        attempt >= 2 ||
        !(error instanceof ApiError) ||
        ![0, 502, 503, 504].includes(error.status)
      )
        throw error;
      await waitForRetry(1000 * (attempt + 1), signal);
    }
  }
}

export const chat = {
  list: (signal: AbortSignal) =>
    api<readonly Conversation[]>("/conversaciones", { signal }),
  create: (usuarioId: string) =>
    api<Conversation>("/conversaciones", {
      method: "POST",
      body: JSON.stringify({ usuarioId }),
    }),
  history,
  socketUrl: (token: string) => {
    const url = new URL("/ws/chat", window.location.href);
    url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("token", token);
    return url.toString();
  },
};
