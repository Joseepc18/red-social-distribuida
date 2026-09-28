import { useCallback } from "react";
import { useRemote } from "../hooks/useRemote";
import { social } from "../services/social";
import { socialCopy } from "../content/social-copy";
import { copy } from "../content/copy";
import { Card } from "./Card";
import { StatusMessage } from "./StatusMessage";
import { UserCard } from "./UserCard";
interface ProfileGraphProps {
  readonly userId: string;
}
export function ProfileGraph({ userId }: ProfileGraphProps) {
  const loadMutuals = useCallback(
    (signal: AbortSignal) => social.mutuals(userId, signal),
    [userId],
  );
  const loadSeparation = useCallback(
    (signal: AbortSignal) => social.separation(userId, signal),
    [userId],
  );
  const mutuals = useRemote(userId, loadMutuals);
  const separation = useRemote(userId, loadSeparation);
  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <Card>
        <section aria-labelledby="mutuals-heading" aria-busy={mutuals.loading}>
          <h2 id="mutuals-heading" className="mb-4">
            {socialCopy.mutuals}
          </h2>
          {mutuals.loading ? (
            <StatusMessage message={copy.loading} />
          ) : mutuals.error ? (
            <StatusMessage
              message={mutuals.error}
              error
              onRetry={mutuals.reload}
            />
          ) : mutuals.data?.length ? (
            <div className="space-y-3">
              {mutuals.data.map((user) => (
                <UserCard key={user.id} user={user} compact />
              ))}
            </div>
          ) : (
            <StatusMessage message={socialCopy.mutualsEmpty} />
          )}
        </section>
      </Card>
      <Card>
        <section
          aria-labelledby="separation-heading"
          aria-busy={separation.loading}
        >
          <h2 id="separation-heading">{socialCopy.separation}</h2>
          <p className="muted mb-4 mt-2 text-sm">
            {socialCopy.separationIntro}
          </p>
          {separation.loading ? (
            <StatusMessage message={copy.loading} />
          ) : separation.error ? (
            <StatusMessage
              message={separation.error}
              error
              onRetry={separation.reload}
            />
          ) : separation.data?.grados == null ? (
            <StatusMessage message={socialCopy.noPath} />
          ) : (
            <div>
              <p className="eyebrow mb-4">
                {socialCopy.distance(separation.data.grados)}
              </p>
              <ol aria-label={socialCopy.path} className="space-y-3">
                {separation.data.cadena.map((username, index) => (
                  <li
                    key={username + index}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <span
                      aria-hidden="true"
                      className="avatar !h-8 !w-8 shrink-0 text-xs"
                    >
                      {index + 1}
                    </span>
                    <span className="break-all font-medium">@{username}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      </Card>
    </div>
  );
}
