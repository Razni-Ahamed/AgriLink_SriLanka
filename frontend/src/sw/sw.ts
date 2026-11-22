/// <reference lib="webworker" />
/**
 * AgriLink's service worker, built by vite-plugin-pwa (injectManifest; see pwa.config.ts).
 *
 * - The app's own code (HTML, JS, CSS) is precached, so the app opens with no signal at all.
 * - Photos and fonts are cached as they are first shown.
 * - A short list of API answers (listings, orders, a farmer's own records) is saved as it loads and
 *   used only when the network fails, keyed to the session that fetched it.
 *
 * A new version waits until the user taps "Reload" on the update notice (src/pwa/UpdatePrompt.tsx),
 * so nobody loses a half-typed form to an automatic reload.
 */
import { clientsClaim } from 'workbox-core'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { API_CACHE, isCacheableApiRequest, sessionCacheKey } from '../pwa/apiCachePolicy'

declare const self: ServiceWorkerGlobalScope

const DAY = 24 * 60 * 60

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Every page of the app is index.html (Static Web Apps' navigationFallback does the same online).
// Files with an extension and Static Web Apps' own /.auth routes are left to the network.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/\.auth\//, /\/[^/]+\.[a-z0-9]+$/i],
  }),
)

// Crop and home photos, and the Sinhala and Tamil fonts. Their names change with their content
// (the long-term immutable caching in staticwebapp.config.json), so a saved copy is never stale;
// they are cached on first use rather than precached, so nobody downloads every photo up front.
registerRoute(
  ({ url, request, sameOrigin }) =>
    sameOrigin &&
    url.pathname.startsWith('/assets/') &&
    (request.destination === 'image' || request.destination === 'font'),
  new CacheFirst({
    cacheName: 'agrilink-assets-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * DAY, purgeOnQuotaError: true }),
    ],
  }),
)

// Listing photos and avatars on Cloudinary: shown from the cache at once, refreshed behind.
registerRoute(
  ({ url, request }) =>
    url.origin === 'https://res.cloudinary.com' && request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'agrilink-photos-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * DAY, purgeOnQuotaError: true }),
    ],
  }),
)

// Saved API answers. Network first, with no timeout: online, every screen shows exactly what the
// server says (a slow cold start included); the saved copy is used only when the request fails.
const apiOrigin = new URL(import.meta.env.VITE_API_BASE_URL).origin
registerRoute(
  ({ url, request }) => isCacheableApiRequest(request.method, url, apiOrigin),
  new NetworkFirst({
    cacheName: API_CACHE,
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) =>
          sessionCacheKey(request.url, request.headers.get('Authorization')),
      },
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * DAY, purgeOnQuotaError: true }),
    ],
  }),
)

self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

// The first install takes over the open tab straight away, so its listings are saved from the
// first visit. Later versions still wait for SKIP_WAITING above.
clientsClaim()
