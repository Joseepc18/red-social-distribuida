import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { useChat } from "../context/chat-context";
import { ConversationList } from "../components/ConversationList";
import { ConversationPanel } from "../components/ConversationPanel";
import { Icon } from "../components/Icon";
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
          <p className="muted text-sm mt-2">
            Tu comunidad, a una conversación.
          </p>
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
          <div className="m-auto text-center p-8 space-y-3">
            <Icon name="chat" className="!h-12 !w-12 mx-auto" />
            <h2>Empieza una conversación</h2>
            <p className="muted text-sm">
              Elige a alguien de la lista para conversar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
