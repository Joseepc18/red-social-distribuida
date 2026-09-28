import { useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useRemote } from "../hooks/useRemote";
import { users } from "../services/users";
import { copy } from "../content/copy";
import { StatusMessage } from "./StatusMessage";
import { Button } from "./Button";
interface SessionValidationProps {
  readonly token: string;
}
export function SessionValidation({ token }: SessionValidationProps) {
  const { startSession, logout } = useAuth();
  const load = useCallback(
    async (signal: AbortSignal) => {
      const profile = await users.me(signal, token);
      if (!signal.aborted) startSession(token, profile);
    },
    [token, startSession],
  );
  const remote = useRemote(token, load);
  return (
    <div className="page-container space-y-4">
      {remote.error ? (
        <>
          <StatusMessage message={remote.error} error onRetry={remote.reload} />
          <Button variant="secondary" onClick={logout}>
            {copy.logout}
          </Button>
        </>
      ) : (
        <StatusMessage message={copy.loading} />
      )}
    </div>
  );
}
