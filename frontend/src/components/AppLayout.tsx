import { Link, NavLink, Outlet, useLocation } from "react-router";
import { copy, homeCopy, navigation, peopleCopy } from "../content/copy";
import { useAuth } from "../hooks/useAuth";
import { ChatProvider } from "../context/ChatProvider";
import { useChat } from "../context/chat-context";
import { AnimatedBrandMark } from "./AnimatedBrandMark";
import { Icon } from "./Icon";
import { AccountMenu } from "./AccountMenu";
import { PushNotifications } from "./PushNotifications";
import { ChatDock } from "./ChatDock";
import { feedRefreshEvent } from "../events/feed-events";

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
  const total = Object.values(unread).reduce((sum, count) => sum + count, 0);
  const { pathname, search } = useLocation();
  const feed = pathname === "/feed";
  const forYou = new URLSearchParams(search).get("vista") === "para-ti";
  const handleNavigationClick = (to: string) => {
    if (to !== "/feed" || !feed) return;

    window.scrollTo({ top: 0, behavior: "instant" });
    if (!forYou) window.dispatchEvent(new Event(feedRefreshEvent));
  };
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        {copy.skip}
      </a>
      <aside className="sidebar">
        <AnimatedBrandMark className="sidebar-brand-mark" />
        <nav aria-label={copy.navigation} className="flex flex-col gap-2">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => handleNavigationClick(item.to)}
              className={({ isActive }) =>
                "nav-link " + (isActive ? "nav-active" : "")
              }
            >
              <Icon name={item.icon} />
              <span className="sidebar-label">{item.label}</span>
              {item.to === "/chat" && total > 0 && (
                <span className="unread-badge">{total}</span>
              )}
            </NavLink>
          ))}
          <Link
            to="/feed#nueva-publicacion"
            className="button button-primary sidebar-compose"
            aria-label={copy.newPost}
          >
            <Icon name="plus" />
            <span className="sidebar-label">{copy.newPost}</span>
          </Link>
        </nav>
        <p className="sidebar-caption">
          {homeCopy.sidebarTagline}
          <span className="block mt-3 text-xs">{homeCopy.communityLabel}</span>
        </p>
      </aside>
      <div className="app-main">
        <header className={"topbar " + (feed ? "feed-topbar" : "")}>
          <div className="mobile-brand">
            <AnimatedBrandMark className="mobile-brand-mark" />
          </div>
          {feed ? (
            <nav aria-label={homeCopy.feedTabsLabel} className="feed-tabs">
              <Link
                to="/feed?vista=siguiendo"
                className={!forYou ? "active" : ""}
                aria-current={!forYou ? "page" : undefined}
              >
                {homeCopy.following}
              </Link>
              <Link
                to="/feed?vista=para-ti"
                className={forYou ? "active" : ""}
                aria-current={forYou ? "page" : undefined}
              >
                {homeCopy.forYou}
              </Link>
            </nav>
          ) : (
            <span className="topbar-title">
              {navigation.find((item) => item.to === pathname)?.label ??
                (pathname === "/configuracion"
                  ? "Configuración"
                  : pathname === "/sugerencias"
                    ? peopleCopy.suggestionsShortcut
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
          <div
            className={
              pathname === "/configuracion"
                ? "settings-panel"
                : "settings-panel-inactive"
            }
          >
            <Outlet />
            {session && (
              <div
                hidden={pathname !== "/configuracion"}
                className="settings-notification-slot"
              >
                <PushNotifications
                  key={session.user.id}
                  userId={session.user.id}
                  token={session.token}
                />
              </div>
            )}
          </div>
        </main>
      </div>
      <nav aria-label={copy.navigation} className="mobile-nav">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => handleNavigationClick(item.to)}
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
