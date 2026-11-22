/**
 * Which API answers the service worker keeps for offline viewing, and under what key.
 *
 * Shared by the service worker (src/sw.ts) and the page (to clear the cache when a session ends),
 * so it imports nothing from the app and touches no DOM.
 */

/** The Cache Storage name for saved API answers. Clearing it on sign-in and sign-out lives in
 *  src/pwa/offlineData.ts. */
export const API_CACHE = 'agrilink-api-v1'

/** The query parameter that ties a saved answer to the session that fetched it. */
export const SESSION_KEY_PARAM = '__session'

/**
 * GET endpoints worth reading on a weak signal: listings, orders, requests, the farmer's own
 * farms, crops and issue reports with their advice, and the small lookup lists every form needs.
 *
 * Deliberately left out: /api/users/me and /api/auth/* (who is signed in must always come from
 * the server), admin and officer queues (they act on fresh data), unread counts and conversations
 * (stale numbers mislead), and photo bytes (large; the browser's own image cache covers them).
 */
const CACHEABLE_PATHS: RegExp[] = [
  /^\/api\/harvests(\/mine|\/price-guide|\/\d+)?$/,
  /^\/api\/orders\/(mine|\d+)$/,
  /^\/api\/purchase-requests(\/mine|\/sent)?$/,
  /^\/api\/issues\/mine$/,
  /^\/api\/advisories\/\d+$/,
  /^\/api\/crops\/(mine|\d+)$/,
  /^\/api\/farms(\/\d+)?$/,
  /^\/api\/farmer\/overview$/,
  /^\/api\/crop-types$/,
  /^\/api\/districts$/,
]

/** True for a GET to the API host whose path is on the list above. */
export function isCacheableApiRequest(method: string, url: URL, apiOrigin: string): boolean {
  if (method !== 'GET' || url.origin !== apiOrigin) return false
  return CACHEABLE_PATHS.some((pattern) => pattern.test(url.pathname))
}

/** Hex SHA-256 of a string, shortened: enough to tell sessions apart, not to identify anyone. */
async function shortHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest).slice(0, 12), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

/**
 * The key a saved answer is stored and looked up under: the request URL plus a hash of its
 * Authorization header ("anon" without one).
 *
 * The Cache API matches on URL alone, so without this, /api/orders/mine saved for one farmer
 * would be handed to the next person to sign in on the same phone while offline. The page also
 * empties the cache whenever a session starts or ends; this key covers the gap where a response
 * that was already on its way lands in the cache just after that.
 */
export async function sessionCacheKey(url: string, authorization: string | null): Promise<string> {
  const keyed = new URL(url)
  keyed.searchParams.set(SESSION_KEY_PARAM, authorization ? await shortHash(authorization) : 'anon')
  return keyed.href
}
