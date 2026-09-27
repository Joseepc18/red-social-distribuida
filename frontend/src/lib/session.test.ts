import { beforeEach, describe, expect, it } from 'vitest'
import { getSession, SESSION_KEY, setSession, syncSession, tokenExpiresAt } from './session'
const user = { id: 'u1', username: 'luis', nombre: 'Luis', bio: '' }
beforeEach(() => { localStorage.clear(); setSession(null) })
describe('session storage', () => {
  it('persists the token and user and restores the session', () => {
    const token = 'header.' + btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 })) + '.signature'
    setSession({ token, user })
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!)).toEqual({ token, user })
    syncSession()
    expect(getSession()?.user.id).toBe('u1')
    setSession(null)
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })
  it('rejects expired, malformed and incomplete stored sessions', () => {
    for (const stored of ['invalid', '{}', JSON.stringify({ token: 'invalid', user }), JSON.stringify({ token: 'a.' + btoa(JSON.stringify({ exp: 1 })) + '.b', user })]) {
      localStorage.setItem(SESSION_KEY, stored)
      syncSession()
      expect(getSession()).toBeNull()
    }
    expect(tokenExpiresAt('invalid')).toBe(0)
  })
})
