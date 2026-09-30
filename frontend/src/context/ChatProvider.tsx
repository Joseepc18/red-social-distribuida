import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useRemote } from "../hooks/useRemote";
import { useChatConnection } from "../hooks/useChatConnection";
import { chat } from "../services/chat";
import { errorMessage } from "../lib/api";
import type { ChatMessage } from "../types/chat";
import { ChatContext, type ConversationHistory } from "./chat-context";
interface ChatProviderProps {
  readonly children: ReactNode;
}
const emptyHistory: ConversationHistory = {
  messages: [],
  nextCursor: null,
  loaded: false,
  loading: false,
  error: "",
  failedBefore: null,
};
function merge(
  current: readonly ChatMessage[],
  incoming: readonly ChatMessage[],
) {
  const messages = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => messages.set(message.id, message));
  return [...messages.values()].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id),
  );
}
export function ChatProvider({ children }: ChatProviderProps) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const remote = useRemote("conversations", chat.list);
  const { reload } = remote;
  const [histories, setHistories] = useState<
    Record<string, ConversationHistory>
  >({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [dockOpen, setDockOpen] = useState(false);
  const [floatingId, setFloatingId] = useState<string | null>(null);
  const visible = useRef(new Set<string>());
  const received = useRef(new Set<string>());
  const unknown = useRef(new Set<string>());
  const requests = useRef(new Map<string, AbortController>());
  const loadedIds = useRef(new Set<string>());
  useEffect(() => {
    const activeRequests = requests.current;
    return () => {
      activeRequests.forEach((request) => request.abort());
      activeRequests.clear();
    };
  }, []);
  const loadHistory = useCallback(
    async (id: string, before: string | null = null) => {
      requests.current.get(id)?.abort();
      const controller = new AbortController();
      requests.current.set(id, controller);
      setHistories((current) => ({
        ...current,
        [id]: {
          ...(current[id] ?? emptyHistory),
          loading: true,
          error: "",
          failedBefore: before,
        },
      }));
      try {
        const page = await chat.history(id, before, controller.signal);
        if (controller.signal.aborted) return;
        loadedIds.current.add(id);
        page.mensajes.forEach((message) => received.current.add(message.id));
        setHistories((current) => {
          const previous = current[id];
          return {
            ...current,
            [id]: {
              messages: merge(previous?.messages ?? [], page.mensajes),
              // Refreshing the newest page preserves an older pagination boundary.
              nextCursor:
                before !== null || !previous?.loaded
                  ? page.siguienteAntes
                  : previous.nextCursor,
              loaded: true,
              loading: false,
              error: "",
              failedBefore: null,
            },
          };
        });
      } catch (error) {
        if (!controller.signal.aborted)
          setHistories((current) => ({
            ...current,
            [id]: {
              ...(current[id] ?? emptyHistory),
              loading: false,
              error: errorMessage(error),
              failedBefore: before,
            },
          }));
      } finally {
        if (requests.current.get(id) === controller)
          requests.current.delete(id);
      }
    },
    [],
  );
  const receiveMessage = useCallback(
    (message: ChatMessage) => {
      if (received.current.has(message.id)) return;
      received.current.add(message.id);
      unknown.current.add(message.conversacionId);
      setHistories((current) => ({
        ...current,
        [message.conversacionId]: {
          ...(current[message.conversacionId] ?? emptyHistory),
          messages: merge(current[message.conversacionId]?.messages ?? [], [
            message,
          ]),
        },
      }));
      if (
        message.autorId !== session?.user.id &&
        (!visible.current.has(message.conversacionId) ||
          document.visibilityState !== "visible" ||
          !document.hasFocus())
      ) {
        setUnread((current) => ({
          ...current,
          [message.conversacionId]: (current[message.conversacionId] ?? 0) + 1,
        }));
      }
    },
    [session?.user.id],
  );
  useEffect(() => {
    if (!remote.data || !unknown.current.size) return;
    const missing = [...unknown.current].some(
      (id) => !remote.data?.some((item) => item.id === id),
    );
    unknown.current.clear();
    if (missing) reload();
  }, [remote.data, histories, reload]);
  const reconnect = useCallback(() => {
    reload();
    loadedIds.current.forEach((id) => {
      void loadHistory(id);
    });
  }, [reload, loadHistory]);
  const connection = useChatConnection(
    session?.token,
    receiveMessage,
    reconnect,
  );
  const markRead = useCallback((id: string) => {
    setUnread((current) => (current[id] ? { ...current, [id]: 0 } : current));
  }, []);
  const setVisible = useCallback((id: string, shown: boolean) => {
    if (shown) visible.current.add(id);
    else visible.current.delete(id);
  }, []);
  function openConversation(id: string) {
    if (window.matchMedia("(max-width: 767px)").matches) {
      navigate("/chat?conversacion=" + encodeURIComponent(id));
    } else {
      setFloatingId(id);
      setDockOpen(true);
    }
    reload();
  }
  function send(id: string) {
    const text = (drafts[id] ?? "").trim();
    if (!text || text.length > 2000 || !connection.send(id, text)) return false;
    setDrafts((current) => ({ ...current, [id]: "" }));
    return true;
  }
  const conversations = [...(remote.data ?? [])].sort((a, b) => {
    const lastA = histories[a.id]?.messages.at(-1)?.fecha ?? a.creadaEn;
    const lastB = histories[b.id]?.messages.at(-1)?.fecha ?? b.creadaEn;
    return lastB.localeCompare(lastA);
  });
  return (
    <ChatContext.Provider
      value={{
        conversations,
        loading: remote.loading,
        error: remote.error,
        reload,
        histories,
        drafts,
        unread,
        ...connection,
        send,
        loadHistory,
        markRead,
        setVisible,
        floatingId,
        dockOpen,
        setDockOpen,
        openConversation,
        showList: () => setFloatingId(null),
        setDraft: (id, text) =>
          setDrafts((current) => ({ ...current, [id]: text })),
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
