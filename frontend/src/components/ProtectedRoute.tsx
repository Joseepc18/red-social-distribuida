import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { SessionValidation } from "./SessionValidation";
interface ProtectedRouteProps {
  readonly children?: never;
}
export function ProtectedRoute(_props: ProtectedRouteProps) {
  const { session, validatedToken } = useAuth();
  const location = useLocation();
  if (!session)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  if (validatedToken !== session.token)
    return <SessionValidation key={session.token} token={session.token} />;
  return <Outlet />;
}
