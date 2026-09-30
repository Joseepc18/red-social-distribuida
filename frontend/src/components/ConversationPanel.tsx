import { useEffect, useRef, useState } from "react";
import { useChat } from "../context/chat-context";
import { useAuth } from "../hooks/useAuth";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { StatusMessage } from "./StatusMessage";
import { chatCopy } from "../content/chat-copy";
import { copy } from "../content/copy";
interface ConversationPanelProps {
  readonly id: string;
  readonly onBack: () => void;
}
export function ConversationPanel({ id, onBack }: ConversationPanelProps) {
  const state = useChat();
  const { session } = useAuth();
  const { loadHistory, markRead, setVisible, reload } = state;
  const conversation = state.conversations.find((item) => item.id === id);
  const history = state.histories[id];
  const draft = state.drafts[id] ?? "";
  const [sendError, setSendError] = useState("");
  const viewport = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const olderAnchor = useRef<{ height: number; top: number } | null>(null);
  const wasLoaded = useRef(false);
  useEffect(() => {
    setVisible(id, true);
    const read = () => {
      if (document.visibilityState === "visible" && document.hasFocus())
        markRead(id);
    };
    read();
    document.addEventListener("visibilitychange", read);
    window.addEventListener("focus", read);
    void loadHistory(id);
    return () => {
      setVisible(id, false);
      document.removeEventListener("visibilitychange", read);
      window.removeEventListener("focus", read);
    };
  }, [id, loadHistory, markRead, setVisible]);
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    if (olderAnchor.current && !history?.loading) {
      node.scrollTop =
        olderAnchor.current.top +
        node.scrollHeight -
        olderAnchor.current.height;
      olderAnchor.current = null;
    } else if (!olderAnchor.current && (!wasLoaded.current || atBottom.current))
      node.scrollTop = node.scrollHeight;
    if (history?.loaded) wasLoaded.current = true;
  }, [history?.messages, history?.loading, history?.loaded, conversation?.id]);
  if (!conversation)
    return (
      <div className="p-4">
        <StatusMessage
          message={
            state.loading ? copy.loading : "No pudimos abrir esta conversación."
          }
          error={!state.loading}
          onRetry={reload}
        />
      </div>
    );
  return (
    <section
      className="conversation-panel"
      aria-label={"Chat con " + conversation.participante.nombre}
    >
      <header className="conversation-header">
        <button
          className="icon-button"
          type="button"
          aria-label={chatCopy.back}
          onClick={onBack}
        >
          <Icon name="back" />
        </button>
        <Avatar name={conversation.participante.nombre} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm">
            {conversation.participante.nombre}
          </h2>
          <p className="muted text-xs mt-1" role="status">
            {state.status === "connected"
              ? chatCopy.connected
              : state.status === "connecting"
                ? chatCopy.connecting
                : chatCopy.reconnecting}
          </p>
        </div>
      </header>
      {(sendError || state.serverError) && (
        <StatusMessage message={sendError || chatCopy.sendError} error />
      )}
      {history?.error && (
        <StatusMessage
          message={history.error}
          error
          onRetry={() => void loadHistory(id, history.failedBefore)}
        />
      )}
      <div
        ref={viewport}
        className="message-scroll"
        role="log"
        aria-label="Mensajes de la conversación"
        aria-live="polite"
        aria-relevant="additions"
        onScroll={() => {
          const node = viewport.current;
          if (node)
            atBottom.current =
              node.scrollHeight - node.clientHeight - node.scrollTop < 80;
        }}
      >
        {history?.loading && <StatusMessage message={copy.loading} />}
        {history?.nextCursor && (
          <Button
            variant="ghost"
            disabled={history.loading}
            onClick={() => {
              if (viewport.current)
                olderAnchor.current = {
                  height: viewport.current.scrollHeight,
                  top: viewport.current.scrollTop,
                };
              void loadHistory(id, history.nextCursor);
            }}
          >
            {chatCopy.older}
          </Button>
        )}
        {history?.loaded && !history.messages.length && (
          <p className="muted m-auto text-sm text-center">
            {chatCopy.emptyHistory}
          </p>
        )}
        {history?.messages.map((message) => (
          <article
            key={message.id}
            aria-label={chatCopy.messageFrom(
              message.autorId === session?.user.id
                ? "ti"
                : conversation.participante.nombre,
            )}
            className={
              "message-bubble " +
              (message.autorId === session?.user.id ? "own" : "")
            }
          >
            <p className="whitespace-pre-wrap break-words text-sm">
              {message.texto}
            </p>
            <time
              dateTime={message.fecha}
              className="block text-right mt-1 text-[10px] opacity-75"
            >
              {new Date(message.fecha).toLocaleString("es", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </time>
          </article>
        ))}
      </div>
      <form
        className="message-composer"
        onSubmit={(event) => {
          event.preventDefault();
          if (!state.send(id)) setSendError(chatCopy.sendUnavailable);
          else {
            setSendError("");
            atBottom.current = true;
          }
        }}
      >
        <label className="flex-1 min-w-0">
          <span className="sr-only">{chatCopy.draft}</span>
          <textarea
            className="input resize-none"
            rows={1}
            maxLength={2000}
            value={draft}
            placeholder={chatCopy.draft}
            onChange={(event) => state.setDraft(id, event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
        </label>
        <Button
          type="submit"
          disabled={state.status !== "connected" || !draft.trim()}
          aria-label={chatCopy.send}
        >
          <Icon name="send" />
        </Button>
      </form>
    </section>
  );
}
