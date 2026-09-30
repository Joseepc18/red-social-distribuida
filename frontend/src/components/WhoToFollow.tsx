import { Link } from "react-router";
import { useSuggestions } from "../hooks/useSuggestions";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { StatusMessage } from "./StatusMessage";
import { Icon } from "./Icon";
import { copy } from "../content/copy";
import { socialCopy } from "../content/social-copy";
interface WhoToFollowProps {
  readonly onFollow: () => void;
}
export function WhoToFollow({ onFollow }: WhoToFollowProps) {
  const state = useSuggestions(onFollow);
  return (
    <aside className="home-aside" aria-label="A quién seguir">
      <section className="follow-box">
        <div className="follow-heading">
          <p className="eyebrow">Tu red</p>
          <h2>A quién seguir</h2>
        </div>
        {state.loading && <StatusMessage message={copy.loading} />}
        {state.error && (
          <StatusMessage message={state.error} error onRetry={state.reload} />
        )}
        {state.mutationError && (
          <StatusMessage message={state.mutationError} error />
        )}
        {state.notice && (
          <p className="muted px-5 text-sm" role="status">
            {state.notice}
          </p>
        )}
        {state.data?.slice(0, 3).map((user) => (
          <div key={user.id} className="follow-row">
            <Link
              to={"/usuarios/" + encodeURIComponent(user.id)}
              aria-label={"Ver perfil de " + user.nombre}
            >
              <Avatar name={user.nombre} />
            </Link>
            <Link
              to={"/usuarios/" + encodeURIComponent(user.id)}
              className="min-w-0 flex-1"
              title={socialCopy.suggestionReason(user)}
            >
              <strong className="block truncate text-sm">{user.nombre}</strong>
              <span className="muted block truncate text-xs mt-1">
                @{user.username}
              </span>
            </Link>
            <Button
              className="!min-h-8 !px-3 !py-1.5 !text-xs"
              disabled={!!state.busyId}
              onClick={() => state.follow(user)}
              aria-label={"Seguir a " + user.nombre}
            >
              {state.busyId === user.id ? "…" : "Seguir"}
            </Button>
          </div>
        ))}
        {state.data?.length === 0 && (
          <p className="muted px-5 pb-4 text-sm">
            {socialCopy.suggestionsEmpty}
          </p>
        )}
        <Link to="/explorar#sugerencias" className="show-more">
          Ver todas las sugerencias
        </Link>
      </section>
      <section className="community-card">
        <span className="community-mark" aria-hidden="true">
          <Icon name="people" />
        </span>
        <p className="eyebrow">Comunidad universitaria</p>
        <h2>Amplía tu red</h2>
        <p>Busca compañeros y conexiones mutuas.</p>
        <Link to="/explorar" className="community-link">
          Buscar personas <span aria-hidden="true">↗</span>
        </Link>
      </section>
      <p className="home-meta">NodoUni · Conecta. Comparte. Aprende.</p>
    </aside>
  );
}
