import { useCallback } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useRemote } from "../hooks/useRemote";
import { users } from "../services/users";
import { StatusMessage } from "./StatusMessage";
import { Button } from "./Button";
import { copy } from "../data/mockData";
interface ProtectedRouteProps {
  readonly children?: never;
}
export function ProtectedRoute(_props: ProtectedRouteProps) {
  const { session, updateUser, logout } = useAuth();
  const location = useLocation();
  const token = session?.token;
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!token) return null;
      const profile = await users.me(signal, token);
      if (!signal.aborted) updateUser(profile);
      return profile;
    },
    [token, updateUser],
  );
  const remote = useRemote(token ?? "signed-out", load);
  if (!session)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  if (remote.loading)
    return (
      <div className="page-container">
        <StatusMessage message={copy.loading} />
      </div>
    );
  if (remote.error)
    return (
      <div className="page-container space-y-4">
        <StatusMessage message={remote.error} error onRetry={remote.reload} />
        <Button variant="secondary" onClick={logout}>
          {copy.logout}
        </Button>
      </div>
    );
  return <Outlet />;
}
