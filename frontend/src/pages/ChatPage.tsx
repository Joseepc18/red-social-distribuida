import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { useChat } from "../context/chat-context";
import { ConversationList } from "../components/ConversationList";
import { ConversationPanel } from "../components/ConversationPanel";
import { Icon } from "../components/Icon";
import { chatCopy } from "../content/chat-copy";
interface ChatPageProps {
  readonly children?: never;
}
export function ChatPage(_props: ChatPageProps) {
  const [params, setParams] = useSearchParams();
  const id = params.get("conversacion");
  const { reload } = useChat();
  useEffect(() => {
    reload();
  }, [reload]);
  return (
    <div className="chat-page">
      <aside className={"chat-page-list " + (id ? "hidden md:flex" : "flex")}>
        <header className="p-5">
          <h1>Mensajes</h1>
        </header>
        <ConversationList
          selected={id}
          onSelect={(value) => setParams({ conversacion: value })}
        />
      </aside>
      <div
        className={"min-w-0 min-h-0 flex-1 " + (id ? "flex" : "hidden md:flex")}
      >
        {id ? (
          <ConversationPanel key={id} id={id} onBack={() => setParams({})} />
        ) : (
          <div className="chat-empty-state">
            <span className="chat-empty-icon" aria-hidden="true">
              <Icon name="send" />
            </span>
            <h2>{chatCopy.emptyStateTitle}</h2>
            <p>{chatCopy.emptyStateBody}</p>
          </div>
        )}
      </div>
    </div>
  );
}
