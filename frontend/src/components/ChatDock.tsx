import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useChat } from "../context/chat-context";
import { ConversationList } from "./ConversationList";
import { ConversationPanel } from "./ConversationPanel";
import { Icon } from "./Icon";
import "../styles/chat.css";
interface ChatDockProps {
  readonly children?: never;
}
export function ChatDock(_props: ChatDockProps) {
  const state = useChat();
  const { setDockOpen, floatingId, dockOpen } = state;
  const location = useLocation();
  const navigate = useNavigate();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const total = Object.values(state.unread).reduce(
    (sum, value) => sum + value,
    0,
  );
  useEffect(() => {
    if (dockOpen) panel.current?.focus();
  }, [dockOpen]);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    function adapt() {
      if (query.matches && dockOpen) {
        setDockOpen(false);
        navigate(
          "/chat" +
            (floatingId
              ? "?conversacion=" + encodeURIComponent(floatingId)
              : ""),
        );
      }
    }
    query.addEventListener("change", adapt);
    return () => query.removeEventListener("change", adapt);
  }, [navigate, dockOpen, floatingId, setDockOpen]);
  if (location.pathname === "/chat") return null;
  function close() {
    setDockOpen(false);
    trigger.current?.focus();
  }
  return (
    <div className="chat-dock">
      {dockOpen && (
        <div
          ref={panel}
          tabIndex={-1}
          className="chat-window"
          role="dialog"
          aria-label="Mensajes"
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <header className="dock-header">
            <h2>Mensajes</h2>
            <div className="flex gap-1">
              <Link
                className="icon-button"
                to={
                  "/chat" +
                  (floatingId
                    ? "?conversacion=" + encodeURIComponent(floatingId)
                    : "")
                }
                aria-label="Abrir mensajes a pantalla completa"
              >
                <Icon name="expand" />
              </Link>
              <button
                className="icon-button"
                type="button"
                aria-label="Minimizar mensajes"
                onClick={close}
              >
                <Icon name="minus" />
              </button>
            </div>
          </header>
          {floatingId ? (
            <ConversationPanel
              key={floatingId}
              id={floatingId}
              onBack={state.showList}
            />
          ) : (
            <div className="overflow-y-auto flex-1">
              <ConversationList
                onSelect={state.openConversation}
                onFindFriends={() => setDockOpen(false)}
              />
            </div>
          )}
        </div>
      )}
      <button
        ref={trigger}
        className="chat-trigger"
        type="button"
        aria-label={"Abrir mensajes" + (total ? ", " + total + " nuevos" : "")}
        aria-expanded={dockOpen}
        onClick={() => {
          if (window.matchMedia("(max-width: 767px)").matches)
            navigate("/chat");
          else {
            if (
              !dockOpen &&
              total > 0 &&
              (!floatingId || !state.unread[floatingId])
            )
              state.showList();
            setDockOpen(!dockOpen);
          }
        }}
      >
        <Icon name="chat" className="!h-7 !w-7" />
        {total > 0 && <span className="unread-badge">{total}</span>}
      </button>
    </div>
  );
}
