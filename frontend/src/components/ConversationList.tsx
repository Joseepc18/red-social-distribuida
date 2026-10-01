import { Link } from "react-router";
import { useChat } from "../context/chat-context";
import { Avatar } from "./Avatar";
import { StatusMessage } from "./StatusMessage";
import { copy } from "../content/copy";
import { chatCopy } from "../content/chat-copy";
interface ConversationListProps {
  readonly selected?: string | null;
  readonly onSelect: (id: string) => void;
}
export function ConversationList({
  selected,
  onSelect,
}: ConversationListProps) {
  const state = useChat();
  if (state.loading) return <StatusMessage message={copy.loading} />;
  if (state.error)
    return (
      <StatusMessage
        message={chatCopy.conversationsError}
        error
        onRetry={state.reload}
      />
    );
  if (!state.conversations.length)
    return (
      <div className="p-6 space-y-4">
        <p className="muted text-sm">{chatCopy.emptyList}</p>
        <Link className="text-link" to="/feed#buscar-personas">
          Buscar amigos
        </Link>
      </div>
    );
  return (
    <ul className="conversation-list">
      {state.conversations.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={
              "conversation-row " + (selected === item.id ? "selected" : "")
            }
            onClick={() => onSelect(item.id)}
            aria-current={selected === item.id ? "true" : undefined}
          >
            <Avatar name={item.participante.nombre} />
            <span className="min-w-0 flex-1 text-left">
              <strong className="block truncate text-sm">
                {item.participante.nombre}
              </strong>
              <span className="muted block truncate text-xs mt-1">
                {state.histories[item.id]?.messages.at(-1)?.texto ??
                  "@" + item.participante.username}
              </span>
            </span>
            {!!state.unread[item.id] && (
              <span
                className="unread-badge"
                aria-label={state.unread[item.id] + " mensajes nuevos"}
              >
                {state.unread[item.id]}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
