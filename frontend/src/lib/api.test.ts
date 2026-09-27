import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './api'
import { getSession, setSession } from './session'
const user = { id: 'u1', username: 'luis', nombre: 'Luis', bio: '' }
const jwt = (seconds = 3600) => 'header.' + btoa(JSON.stringify({ exp: Date.now() / 1000 + seconds })) + '.signature'
beforeEach(() => setSession(null))
afterEach(() => { vi.unstubAllGlobals(); setSession(null) })
describe('API client', () => {
  it('adds the active bearer token to private requests', async () => {
    const token = jwt()
    setSession({ token, user })
    const fetchMock = vi.fn().mockResolvedValue(Response.json(user))
    vi.stubGlobal('fetch', fetchMock)
    expect(await api('/usuarios/me')).toEqual(user)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/usuarios/me')
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer ' + token)
  })
  it('omits authorization on public requests', async () => {
    setSession({ token: jwt(), user })
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ token: 'new' }))
    vi.stubGlobal('fetch', fetchMock)
    await api('/auth/login', { auth: false, method: 'POST', body: JSON.stringify({ username: 'luis', password: 'test' }) })
    expect(fetchMock.mock.calls[0][1].headers.has('Authorization')).toBe(false)
    expect(fetchMock.mock.calls[0][1].headers.get('Content-Type')).toBe('application/json')
  })
  it('preserves the multipart boundary and accepts 204 responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const body = new FormData()
    body.set('texto', 'Hola')
    expect(await api('/posts', { method: 'POST', body })).toBeUndefined()
    expect(fetchMock.mock.calls[0][1].headers.has('Content-Type')).toBe(false)
  })
  it('exposes the common business error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'USERNAME_EN_USO', mensaje: 'El usuario ya existe' }, { status: 409 })))
    await expect(api('/auth/registro', { auth: false })).rejects.toMatchObject({ status: 409, code: 'USERNAME_EN_USO', message: 'El usuario ya existe' })
  })
  it('clears a rejected session but does not erase a newer session', async () => {
    const token = jwt()
    setSession({ token, user })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
    await expect(api('/usuarios/me')).rejects.toBeInstanceOf(ApiError)
    expect(getSession()).toBeNull()
    setSession({ token, user })
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      setSession({ token: jwt(7200), user })
      return new Response(null, { status: 401 })
    }))
    await expect(api('/usuarios/me')).rejects.toBeInstanceOf(ApiError)
    expect(getSession()).not.toBeNull()
  })
  it('handles proxy failures and network failures with readable messages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Error</html>', { status: 502 })))
    await expect(api('/usuarios')).rejects.toMatchObject({ status: 502, code: 'HTTP_502' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(api('/usuarios')).rejects.toMatchObject({ status: 0, code: 'CONEXION' })
  })
  it('preserves cancellation and refuses external paths', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')))
    await expect(api('/usuarios')).rejects.toMatchObject({ name: 'AbortError' })
    await expect(api('//example.com')).rejects.toThrow('API paths must be relative')
  })
})
