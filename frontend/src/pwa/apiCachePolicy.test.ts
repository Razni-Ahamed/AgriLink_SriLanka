import { describe, expect, it } from 'vitest'
import { SESSION_KEY_PARAM, isCacheableApiRequest, sessionCacheKey } from './apiCachePolicy'

const API = 'https://agrilink-api-sl.azurewebsites.net'
const cacheable = (path: string, method = 'GET', origin = API) =>
  isCacheableApiRequest(method, new URL(path, origin), API)

describe('which API answers are saved for offline viewing', () => {
  it.each([
    '/api/harvests?page=2&cropType=Carrot',
    '/api/harvests/mine',
    '/api/harvests/42',
    '/api/harvests/price-guide?cropType=Carrot',
    '/api/orders/mine',
    '/api/orders/7',
    '/api/purchase-requests/mine',
    '/api/purchase-requests/sent',
    '/api/issues/mine?page=1',
    '/api/advisories/5',
    '/api/crops/mine',
    '/api/farms',
    '/api/farms/3',
    '/api/farmer/overview',
    '/api/crop-types',
    '/api/districts',
  ])('saves GET %s', (path) => {
    expect(cacheable(path)).toBe(true)
  })

  it.each([
    // Who is signed in always comes from the server.
    '/api/users/me',
    '/api/auth/login',
    // Queues and counts that act on fresh data.
    '/api/issues/pending',
    '/api/admin/users',
    '/api/notifications/unread-count',
    '/api/conversations',
    // Photo bytes behind an issue.
    '/api/issues/9/photos/1',
  ])('never saves GET %s', (path) => {
    expect(cacheable(path)).toBe(false)
  })

  it('never saves a write, or a request to any other host', () => {
    expect(cacheable('/api/harvests', 'POST')).toBe(false)
    expect(cacheable('/api/orders/7', 'PUT')).toBe(false)
    expect(cacheable('/api/harvests', 'GET', 'https://example.com')).toBe(false)
  })
})

describe('sessionCacheKey', () => {
  const url = `${API}/api/orders/mine?page=1`

  it("keeps one session's saved answers from another's", async () => {
    const first = await sessionCacheKey(url, 'Bearer token-for-farmer-a')
    const second = await sessionCacheKey(url, 'Bearer token-for-farmer-b')

    expect(first).not.toBe(second)
    expect(await sessionCacheKey(url, 'Bearer token-for-farmer-a')).toBe(first)
  })

  it('keeps the original query and never stores the token itself', async () => {
    const key = new URL(await sessionCacheKey(url, 'Bearer secret-token'))

    expect(key.pathname).toBe('/api/orders/mine')
    expect(key.searchParams.get('page')).toBe('1')
    expect(key.searchParams.get(SESSION_KEY_PARAM)).toMatch(/^[0-9a-f]{24}$/)
    expect(key.href).not.toContain('secret-token')
  })

  it('files signed-out requests apart from signed-in ones', async () => {
    const key = new URL(await sessionCacheKey(`${API}/api/harvests`, null))
    expect(key.searchParams.get(SESSION_KEY_PARAM)).toBe('anon')
  })
})
