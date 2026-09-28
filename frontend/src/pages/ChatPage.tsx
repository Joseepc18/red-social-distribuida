import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { StatusMessage } from "../components/StatusMessage";
import { chatCopy } from "../content/chat-copy";
import { copy } from "../content/copy";
import { useAuth } from "../hooks/useAuth";
import { useChatConnection } from "../hooks/useChatConnection";
import { useRemote } from "../hooks/useRemote";
import { errorMessage } from "../lib/api";
import { chat } from "../services/chat";
import type { ChatMessage } from "../types/chat";

interface ChatPageProps {
  readonly children?: never;
}

interface ConversationHistory {
  readonly messages: readonly ChatMessage[];
  readonly nextCursor: string | null;
  readonly loaded: boolean;
  readonly loading: boolean;
  readonly loadingOlder: boolean;
  readonly error: string;
  readonly failedBefore: string | null;
}

function sortMessages(messages: readonly ChatMessage[]) {
  return [...messages].sort(
    (left, right) =>
      left.fecha.localeCompare(right.fecha) || left.id.localeCompare(right.id),
  );
}

function mergeMessages(
  current: readonly ChatMessage[],
  incoming: readonly ChatMessage[],
) {
  const unique = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) unique.set(message.id, message);
  return sortMessages([...unique.values()]);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });
}

export function ChatPage(_props: ChatPageProps) {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = searchParams.get("conversacion");
  const loadConversations = useCallback(
    (signal: AbortSignal) => chat.list(signal),
    [],
  );
  const conversationsState = useRemote(
    "conversations:" + (session?.token ?? ""),
    loadConversations,
  );
  const conversations = conversationsState.data ?? [];
  const activeConversation = conversations.find(
    (conversation) => conversation.id === requestedId,
  );
  const [histories, setHistories] = useState<
    Readonly<Record<string, ConversationHistory>>
  >({});
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState("");
  const activeHistory = requestedId ? histories[requestedId] : undefined;
  const activeId = activeConversation?.id;

  const loadHistory = useCallback(
    async (
      conversationId: string,
      before: string | null,
      signal?: AbortSignal,
    ) => {
      setHistories((current) => ({
        ...current,
        [conversationId]: {
          ...(current[conversationId] ?? {
            messages: [],
            nextCursor: null,
            loaded: false,
            loadingOlder: false,
          }),
          loading: before === null,
          loadingOlder: before !== null,
          error: "",
          failedBefore: null,
        },
      }));
      try {
        const page = await chat.history(conversationId, before, signal);
        if (signal?.aborted) return;
        setHistories((current) => {
          const previous = current[conversationId];
          return {
            ...current,
            [conversationId]: {
              messages: mergeMessages(previous?.messages ?? [], page.mensajes),
              nextCursor: page.siguienteAntes,
              loaded: true,
              loading: false,
              loadingOlder: false,
              error: "",
              failedBefore: null,
            },
          };
        });
      } catch (error: unknown) {
        if (signal?.aborted) return;
        setHistories((current) => ({
          ...current,
          [conversationId]: {
            ...(current[conversationId] ?? {
              messages: [],
              nextCursor: null,
              loaded: false,
            }),
            loading: false,
            loadingOlder: false,
            error: errorMessage(error) || chatCopy.historyError,
            failedBefore: before,
          },
        }));
      }
    },
    [],
  );

  useEffect(() => {
    if (!activeId) return;
    const controller = new AbortController();
    void loadHistory(activeId, null, controller.signal);
    return () => controller.abort();
  }, [activeId, loadHistory]);

  const receiveMessage = useCallback((message: ChatMessage) => {
    setHistories((current) => {
      const previous = current[message.conversacionId];
      return {
        ...current,
        [message.conversacionId]: {
          messages: mergeMessages(previous?.messages ?? [], [message]),
          nextCursor: previous?.nextCursor ?? null,
          loaded: previous?.loaded ?? false,
          loading: previous?.loading ?? false,
          loadingOlder: previous?.loadingOlder ?? false,
          error: "",
          failedBefore: null,
        },
      };
    });
  }, []);

  const reloadAfterReconnect = useCallback(() => {
    if (activeId) void loadHistory(activeId, null);
  }, [activeId, loadHistory]);
  const connection = useChatConnection(
    session?.token,
    receiveMessage,
    reloadAfterReconnect,
  );

  const messages = useMemo(
    () => activeHistory?.messages ?? [],
    [activeHistory?.messages],
  );

  function chooseConversation(id: string) {
    setDraft("");
    setSendError("");
    setSearchParams({ conversacion: id });
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeId) return;
    const text = draft.trim();
    if (!text) return;
    if (text.length > 2000) {
      setSendError(chatCopy.sendError);
      return;
    }
    if (!connection.send(activeId, text)) {
      setSendError(chatCopy.sendUnavailable);
      return;
    }
    setDraft("");
    setSendError("");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="eyebrow">{copy.member}</p>
        <h1>{chatCopy.title}</h1>
        <p className="muted mt-3">{chatCopy.intro}</p>
      </header>

      {conversationsState.loading && <StatusMessage message={copy.loading} />}
      {conversationsState.error && (
        <StatusMessage
          message={chatCopy.conversationsError}
          error
          onRetry={conversationsState.reload}
        />
      )}

      {!conversationsState.loading && !conversationsState.error && (
        <div className="grid min-h-[28rem] items-start gap-5 md:grid-cols-[minmax(15rem,0.75fr)_minmax(0,1.5fr)]">
          <section
            aria-label={chatCopy.conversations}
            className={
              "card min-w-0 space-y-3 " +
              (activeConversation ? "hidden md:block" : "")
            }
          >
            <h2>{chatCopy.conversations}</h2>
            {conversations.length === 0 ? (
              <div className="space-y-3">
                <p className="muted text-sm">{chatCopy.emptyList}</p>
                <p className="muted text-sm">{chatCopy.emptyListHelp}</p>
                <Link className="text-link" to="/explorar">
                  {copy.explore}
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {conversations.map((conversation) => {
                  const selected = conversation.id === requestedId;
                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        className={
                          "flex min-h-16 w-full items-center gap-3 rounded-xl p-3 text-left transition-colors " +
                          (selected
                            ? "bg-primary-container text-on-primary dark:bg-inverse-primary dark:text-on-primary-fixed"
                            : "bg-surface-container-low hover:bg-surface-container-high dark:bg-on-surface dark:hover:bg-on-surface-variant")
                        }
                        aria-current={selected ? "page" : undefined}
                        onClick={() => chooseConversation(conversation.id)}
                      >
                        <Avatar name={conversation.participante.nombre} />
                        <span className="min-w-0">
                          <strong className="block truncate">
                            {conversation.participante.nombre}
                          </strong>
                          <span className="muted block truncate text-xs">
                            @{conversation.participante.username}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section
            aria-label={
              activeConversation?.participante.nombre ?? chatCopy.title
            }
            className={
              "card flex h-[72vh] max-h-[52rem] min-h-[28rem] min-w-0 flex-col " +
              (activeConversation ? "" : "hidden md:flex")
            }
          >
            {!activeConversation ? (
              <p className="muted m-auto text-center">
                {chatCopy.selectConversation}
              </p>
            ) : (
              <>
                <header className="mb-4 flex items-center gap-3 border-b border-outline-variant/30 pb-4">
                  <Button
                    variant="ghost"
                    className="md:hidden"
                    onClick={() => setSearchParams({})}
                    aria-label={chatCopy.back}
                  >
                    {chatCopy.back}
                  </Button>
                  <Avatar name={activeConversation.participante.nombre} />
                  <div className="min-w-0">
                    <h2 className="truncate">
                      {activeConversation.participante.nombre}
                    </h2>
                    <p className="muted truncate text-xs">
                      @{activeConversation.participante.username}
                    </p>
                  </div>
                  <span
                    className="muted ml-auto text-xs"
                    role="status"
                    aria-live="polite"
                  >
                    {connection.status === "connected"
                      ? chatCopy.connected
                      : connection.status === "connecting"
                        ? chatCopy.connecting
                        : chatCopy.reconnecting}
                  </span>
                </header>

                {connection.serverError && (
                  <StatusMessage message={chatCopy.sendError} error />
                )}
                {activeHistory?.error && (
                  <StatusMessage
                    message={activeHistory.error || chatCopy.historyError}
                    error
                    onRetry={() =>
                      void loadHistory(
                        activeConversation.id,
                        activeHistory.failedBefore,
                      )
                    }
                  />
                )}
                {activeHistory?.loading && (
                  <StatusMessage message={copy.loading} />
                )}
                {activeHistory?.nextCursor && (
                  <div className="mb-4 flex justify-center">
                    <Button
                      variant="secondary"
                      disabled={activeHistory.loadingOlder}
                      onClick={() =>
                        void loadHistory(
                          activeConversation.id,
                          activeHistory.nextCursor,
                        )
                      }
                    >
                      {activeHistory.loadingOlder
                        ? chatCopy.loadingOlder
                        : chatCopy.older}
                    </Button>
                  </div>
                )}

                <div
                  className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-2"
                  aria-live="polite"
                  aria-relevant="additions"
                  aria-label={chatCopy.title}
                >
                  {messages.length === 0 &&
                    activeHistory?.loaded &&
                    !activeHistory?.loading &&
                    !activeHistory?.error && (
                      <p className="muted m-auto text-center">
                        {chatCopy.emptyHistory}
                      </p>
                    )}
                  {messages.map((message) => {
                    const own = message.autorId === session?.user.id;
                    return (
                      <article
                        key={message.id}
                        aria-label={chatCopy.messageFrom(
                          own ? "ti" : activeConversation.participante.nombre,
                        )}
                        className={
                          "max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] " +
                          (own
                            ? "ml-auto bg-primary-container text-on-primary dark:bg-inverse-primary dark:text-on-primary-fixed"
                            : "mr-auto bg-surface-container-low text-on-surface dark:bg-on-surface dark:text-inverse-on-surface")
                        }
                      >
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {message.texto}
                        </p>
                        <time
                          className="mt-2 block text-right text-[0.7rem] opacity-75"
                          dateTime={message.fecha}
                        >
                          {formatDate(message.fecha)}
                        </time>
                      </article>
                    );
                  })}
                </div>

                {sendError && <StatusMessage message={sendError} error />}
                <form
                  className="mt-4 flex flex-col gap-3 border-t border-outline-variant/30 pt-4 sm:flex-row sm:items-end"
                  onSubmit={sendMessage}
                >
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">{chatCopy.draft}</span>
                    <textarea
                      className="input min-h-12 w-full resize-y"
                      name="mensaje"
                      value={draft}
                      maxLength={2000}
                      rows={2}
                      placeholder={chatCopy.draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                    />
                    <span className="muted mt-1 block text-right text-xs">
                      {draft.length}/2000
                    </span>
                  </label>
                  <Button
                    type="submit"
                    disabled={
                      connection.status !== "connected" || !draft.trim()
                    }
                  >
                    {chatCopy.send}
                  </Button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
