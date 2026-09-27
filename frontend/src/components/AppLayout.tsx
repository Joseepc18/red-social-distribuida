import { Link, NavLink, Outlet } from "react-router";
import { copy, navigation } from "../content/copy";
import { useAuth } from "../hooks/useAuth";
import { Brand } from "./Brand";
import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
interface AppLayoutProps {
  readonly children?: never;
}
export function AppLayout(_props: AppLayoutProps) {
  const { session, logout } = useAuth();
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
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-account">
          {session ? (
            <>
              <Link className="flex min-w-0 items-center gap-3" to="/perfil">
                <Avatar name={session.user.nombre} />
                <span className="min-w-0">
                  <strong className="block truncate text-sm">
                    {session.user.nombre}
                  </strong>
                  <span className="muted text-xs">
                    @{session.user.username}
                  </span>
                </span>
              </Link>
              <Button variant="ghost" onClick={logout} aria-label={copy.logout}>
                <Icon name="logout" />
              </Button>
            </>
          ) : (
            <Link to="/login" className="button button-primary w-full">
              {copy.login}
            </Link>
          )}
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <Brand compact />
          <Link to="/explorar" className="search-shortcut">
            <Icon name="search" />
            <span>{copy.search}</span>
          </Link>
          {session && (
            <Link to="/perfil" aria-label={copy.profile}>
              <Avatar name={session.user.nombre} />
            </Link>
          )}
          {session && (
            <Button
              variant="ghost"
              className="lg:hidden"
              onClick={logout}
              aria-label={copy.logout}
            >
              <Icon name="logout" />
            </Button>
          )}
        </header>
        <main id="main-content" className="page-container" tabIndex={-1}>
          <Outlet />
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
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
