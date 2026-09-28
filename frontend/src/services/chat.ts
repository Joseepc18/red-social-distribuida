import { api } from "../lib/api";
import type { Conversation, MessagePage } from "../types/chat";

export const chat = {
  list: (signal: AbortSignal) =>
    api<readonly Conversation[]>("/conversaciones", { signal }),
  create: (usuarioId: string) =>
    api<Conversation>("/conversaciones", {
      method: "POST",
      body: JSON.stringify({ usuarioId }),
    }),
  history: (id: string, antes: string | null, signal?: AbortSignal) => {
    const query = antes ? "?antes=" + encodeURIComponent(antes) : "";
    return api<MessagePage>(
      "/conversaciones/" + encodeURIComponent(id) + "/mensajes" + query,
      { signal },
    );
  },
  socketUrl: (token: string) => {
    const url = new URL("/ws/chat", window.location.href);
    url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("token", token);
    return url.toString();
  },
};
