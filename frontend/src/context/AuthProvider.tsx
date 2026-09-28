import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AuthContext } from "./auth-context";
import { disablePush } from "../services/push";
import type { Session } from "../types/api";
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
  const [validatedToken, setValidatedToken] = useState<string | null>(null);
  const previousSession = useRef<Session | null>(null);
  useEffect(() => {
    const previous = previousSession.current;
    previousSession.current = session;
    if (previous && previous.user.id !== session?.user.id) {
      void disablePush(previous.user.id, previous.token).catch(() => {
        /* Local opt-out is attempted even if server cleanup is unavailable. */
      });
    }
  }, [session]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === SESSION_KEY || event.key === null) {
        setValidatedToken(null);
        syncSession();
      }
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
  const startSession = useCallback((token: string, user: Profile) => {
    setValidatedToken(token);
    setSession({ token, user });
  }, []);
  const updateUser = useCallback((user: Profile) => {
    const active = getSession();
    if (active?.user.id === user.id) setSession({ ...active, user });
  }, []);
  const logout = useCallback(() => {
    setValidatedToken(null);
    setSession(null);
  }, []);
  const value = useMemo(
    () => ({ session, validatedToken, startSession, updateUser, logout }),
    [session, validatedToken, startSession, updateUser, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
