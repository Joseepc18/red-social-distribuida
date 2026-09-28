import { useRemote } from "../hooks/useRemote";
import { useSuggestions } from "../hooks/useSuggestions";
import { social } from "../services/social";
import { socialCopy } from "../content/social-copy";
import { copy } from "../content/copy";
import { StatusMessage } from "./StatusMessage";
import { SuggestionCard } from "./SuggestionCard";
import { UserCard } from "./UserCard";
import { Card } from "./Card";
interface NetworkExplorerProps {
  readonly children?: never;
}
export function NetworkExplorer(_props: NetworkExplorerProps) {
  const reach = useRemote("reach", social.reach);
  const suggestions = useSuggestions(reach.reload);
  return (
    <div className="space-y-8">
      <section
        aria-labelledby="suggestions-heading"
        aria-busy={suggestions.loading}
      >
        <p className="eyebrow">{socialCopy.eyebrow}</p>
        <h2 id="suggestions-heading">{socialCopy.suggestions}</h2>
        <p className="muted mb-5 mt-2">{socialCopy.suggestionsIntro}</p>
        {suggestions.mutationError && (
          <StatusMessage message={suggestions.mutationError} error />
        )}
        {suggestions.notice && <StatusMessage message={suggestions.notice} />}
        {suggestions.loading ? (
          <StatusMessage message={copy.loading} />
        ) : suggestions.error ? (
          <StatusMessage
            message={suggestions.error}
            error
            onRetry={suggestions.reload}
          />
        ) : suggestions.data?.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {suggestions.data.map((user) => (
              <SuggestionCard
                key={user.id}
                user={user}
                busy={suggestions.busyId === user.id}
                disabled={suggestions.busyId !== null}
                onFollow={suggestions.follow}
              />
            ))}
          </div>
        ) : (
          <StatusMessage message={socialCopy.suggestionsEmpty} />
        )}
      </section>
      <Card>
        <section aria-labelledby="reach-heading" aria-busy={reach.loading}>
          <h2 id="reach-heading">{socialCopy.reach}</h2>
          <p className="muted mb-5 mt-2">{socialCopy.reachIntro}</p>
          {reach.loading ? (
            <StatusMessage message={copy.loading} />
          ) : reach.error ? (
            <StatusMessage message={reach.error} error onRetry={reach.reload} />
          ) : reach.data?.length ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {reach.data.map((user) => (
                <li key={user.id} className="min-w-0">
                  <p className="eyebrow mb-2">
                    {socialCopy.distance(user.distancia)}
                  </p>
                  <UserCard user={user} compact />
                </li>
              ))}
            </ul>
          ) : (
            <StatusMessage message={socialCopy.reachEmpty} />
          )}
        </section>
      </Card>
    </div>
  );
}
