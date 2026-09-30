import { Link, NavLink, Outlet, useLocation } from "react-router";
import { copy, navigation } from "../content/copy";
import { useAuth } from "../hooks/useAuth";
import { ChatProvider } from "../context/ChatProvider";
import { useChat } from "../context/chat-context";
import { Brand } from "./Brand";
import { Icon } from "./Icon";
import { AccountMenu } from "./AccountMenu";
import { ChatDock } from "./ChatDock";
import { PushNotifications } from "./PushNotifications";
interface AppLayoutProps {
  readonly children?: never;
}
export function AppLayout(_props: AppLayoutProps) {
  const { session } = useAuth();
  return (
    <ChatProvider key={session?.token}>
      <LayoutContent />
    </ChatProvider>
  );
}
function LayoutContent() {
  const { session } = useAuth();
  const { unread } = useChat();
  const total = Object.values(unread).reduce((sum, value) => sum + value, 0);
  const { pathname, search } = useLocation();
  const feed = pathname === "/feed";
  const following = new URLSearchParams(search).get("vista") === "siguiendo";
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        {copy.skip}
      </a>
      <aside className="sidebar">
        <Brand />
        <nav aria-label={copy.navigation} className="flex flex-col gap-2">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                "nav-link " + (isActive ? "nav-active" : "")
              }
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.to === "/chat" && total > 0 && (
                <span className="unread-badge">{total}</span>
              )}
            </NavLink>
          ))}
          <Link
            to="/feed#nueva-publicacion"
            className="button button-primary sidebar-compose"
          >
            <Icon name="plus" />
            {copy.newPost}
          </Link>
        </nav>
        <p className="sidebar-caption">
          Un espacio para compartir
          <br />
          lo que nos conecta.
          <span className="block mt-3 text-xs">
            NodoUni · Comunidad universitaria
          </span>
        </p>
      </aside>
      <div className="app-main">
        <header className={"topbar " + (feed ? "feed-topbar" : "")}>
          <div className="mobile-brand">
            <Brand compact />
          </div>
          {feed ? (
            <nav aria-label="Tipo de publicaciones" className="feed-tabs">
              <Link
                to="/feed"
                className={!following ? "active" : ""}
                aria-current={!following ? "page" : undefined}
              >
                Para ti
              </Link>
              <Link
                to="/feed?vista=siguiendo"
                className={following ? "active" : ""}
                aria-current={following ? "page" : undefined}
              >
                Siguiendo
              </Link>
            </nav>
          ) : (
            <span className="topbar-title">
              {navigation.find((item) => item.to === pathname)?.label ??
                (pathname === "/configuracion"
                  ? "Configuración"
                  : "Tu comunidad")}
            </span>
          )}
          <div className="topbar-account">
            <AccountMenu key={pathname + search} />
          </div>
        </header>
        <main
          id="main-content"
          className={
            "page-container " +
            (feed ? "feed-container" : "") +
            (pathname === "/chat" ? " chat-container" : "")
          }
          tabIndex={-1}
        >
          <Outlet />
          {session && (
            <div hidden={pathname !== "/configuracion"} className="mt-6">
              <PushNotifications
                key={session.user.id}
                userId={session.user.id}
                token={session.token}
              />
            </div>
          )}
        </main>
      </div>
      <nav aria-label={copy.navigation} className="mobile-nav">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              "mobile-link " + (isActive ? "mobile-active" : "")
            }
          >
            <Icon name={item.icon} />
            <span>
              {item.label}
              {item.to === "/chat" && total > 0 ? " (" + total + ")" : ""}
            </span>
          </NavLink>
        ))}
      </nav>
      <ChatDock />
    </div>
  );
}
