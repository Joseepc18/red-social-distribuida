import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
interface AccountMenuProps {
  readonly children?: never;
}
export function AccountMenu(_props: AccountMenuProps) {
  const { session, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    function dismiss(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  if (!session) return null;
  return (
    <div
      ref={wrapper}
      className="account-wrapper"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="account-trigger"
        aria-label="Abrir opciones de cuenta"
        aria-expanded={open}
        aria-controls="account-options"
        onClick={() => setOpen(!open)}
      >
        <Avatar name={session.user.nombre} />
        <span className="account-chevron">
          <Icon name="chevron" className="!h-3 !w-3" />
        </span>
      </button>
      {open && (
        <section
          id="account-options"
          className="account-menu"
          aria-label="Opciones de cuenta"
        >
          <Link ref={first} className="account-profile" to="/perfil">
            <Avatar name={session.user.nombre} />
            <span className="min-w-0">
              <strong className="block truncate">{session.user.nombre}</strong>
              <span className="muted text-xs">@{session.user.username}</span>
            </span>
          </Link>
          <Link className="account-option" to="/perfil">
            <Icon name="profile" />
            <span>
              Perfil
              <span className="muted block text-xs font-normal">
                Edita tu nombre y biografía
              </span>
            </span>
          </Link>
          <Link className="account-option" to="/configuracion">
            <Icon name="settings" />
            Configuración
          </Link>
          <button className="account-option" type="button" onClick={logout}>
            <Icon name="logout" />
            Cerrar sesión
          </button>
        </section>
      )}
    </div>
  );
}
