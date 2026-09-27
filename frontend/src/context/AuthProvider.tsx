import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { AuthContext } from './auth-context'
import { getSession, SESSION_KEY, setSession, subscribeSession, syncSession, tokenExpiresAt } from '../lib/session'
interface AuthProviderProps { readonly children: ReactNode }
export function AuthProvider({ children }: AuthProviderProps) {
  const session = useSyncExternalStore(subscribeSession, getSession)
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === SESSION_KEY || event.key === null) syncSession() }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  useEffect(() => {
    if (!session) return
    const timer = window.setTimeout(() => setSession(null), Math.min(Math.max(0, tokenExpiresAt(session.token) - Date.now()), 2_147_483_647))
    return () => window.clearTimeout(timer)
  }, [session])
  const value = useMemo(() => ({
    session,
    startSession: (token: string, user: import('../types/api').Profile) => setSession({ token, user }),
    updateUser: (user: import('../types/api').Profile) => {
      const active = getSession()
      if (active) setSession({ ...active, user })
    },
    logout: () => setSession(null),
  }), [session])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
