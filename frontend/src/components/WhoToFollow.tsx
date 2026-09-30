import { Link } from "react-router";
import { useSuggestions } from "../hooks/useSuggestions";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { StatusMessage } from "./StatusMessage";
import { Icon } from "./Icon";
import { copy, homeCopy } from "../content/copy";
import { socialCopy } from "../content/social-copy";
interface WhoToFollowProps {
  readonly onFollow: () => void;
}
export function WhoToFollow({ onFollow }: WhoToFollowProps) {
  const state = useSuggestions(onFollow);
  return (
    <aside className="home-aside" aria-label={homeCopy.followTitle}>
      <section className="follow-box">
        <div className="follow-heading">
          <p className="eyebrow">{homeCopy.followEyebrow}</p>
          <h2>{homeCopy.followTitle}</h2>
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
              aria-label={homeCopy.viewProfile(user.nombre)}
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
              aria-label={homeCopy.followPerson(user.nombre)}
            >
              {state.busyId === user.id
                ? homeCopy.followPending
                : homeCopy.follow}
            </Button>
          </div>
        ))}
        {state.data?.length === 0 && (
          <p className="muted px-5 pb-4 text-sm">
            {socialCopy.suggestionsEmpty}
          </p>
        )}
        <Link to="/explorar#sugerencias" className="show-more">
          {homeCopy.showSuggestions}
        </Link>
      </section>
      <section className="community-card">
        <span className="community-mark" aria-hidden="true">
          <Icon name="people" />
        </span>
        <p className="eyebrow">{homeCopy.communityEyebrow}</p>
        <h2>{homeCopy.communityTitle}</h2>
        <p>{homeCopy.communityDescription}</p>
        <Link to="/explorar" className="community-link">
          {homeCopy.findPeople} <span aria-hidden="true">↗</span>
        </Link>
      </section>
      <p className="home-meta">{homeCopy.motto}</p>
    </aside>
  );
}
