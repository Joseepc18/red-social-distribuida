import {
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AuthContext } from "./auth-context";
import type { Profile } from "../types/api";
import {
  getSession,
  SESSION_KEY,
  setSession,
  subscribeSession,
  syncSession,
  tokenExpiresAt,
} from "../lib/session";
interface AuthProviderProps {
  readonly children: ReactNode;
}
export function AuthProvider({ children }: AuthProviderProps) {
  const session = useSyncExternalStore(subscribeSession, getSession);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === SESSION_KEY || event.key === null) syncSession();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(
      () => setSession(null),
      Math.min(
        Math.max(0, tokenExpiresAt(session.token) - Date.now()),
        2_147_483_647,
      ),
    );
    return () => window.clearTimeout(timer);
  }, [session]);
  const startSession = useCallback(
    (token: string, user: Profile) => setSession({ token, user }),
    [],
  );
  const updateUser = useCallback((user: Profile) => {
    const active = getSession();
    if (active?.user.id === user.id) setSession({ ...active, user });
  }, []);
  const logout = useCallback(() => setSession(null), []);
  const value = useMemo(
    () => ({ session, startSession, updateUser, logout }),
    [session, startSession, updateUser, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
