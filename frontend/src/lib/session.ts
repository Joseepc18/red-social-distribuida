import type { Profile, Session } from '../types/api'

export const SESSION_KEY = 'nodouni.session'
export function tokenExpiresAt(token: string): number {
  try {
    const payload: unknown = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload && typeof payload === 'object' && 'exp' in payload && typeof payload.exp === 'number') return payload.exp * 1000
  } catch { /* Malformed tokens cannot establish a session. */ }
  return 0
}
function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') return false
  const user = value as Partial<Profile>
  return typeof user.id === 'string' && typeof user.username === 'string' && typeof user.nombre === 'string'
    && (user.bio === null || typeof user.bio === 'string')
}
function readSession(): Session | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    if (stored && typeof stored === 'object' && 'token' in stored && typeof stored.token === 'string'
      && tokenExpiresAt(stored.token) > Date.now() && 'user' in stored && isProfile(stored.user)) {
      return { token: stored.token, user: stored.user }
    }
  } catch { /* Missing or invalid storage starts a signed-out session. */ }
  return null
}
let current = readSession()
const listeners = new Set<() => void>()
export const getSession = () => current
export const subscribeSession = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function setSession(session: Session | null) {
  current = session
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch { /* The current tab keeps working when storage is unavailable. */ }
  listeners.forEach((listener) => listener())
}
export function syncSession() {
  current = readSession()
  listeners.forEach((listener) => listener())
}
