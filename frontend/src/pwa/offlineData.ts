import { API_CACHE } from './apiCachePolicy'

/**
 * Empties the API answers the service worker saved for offline viewing. Called whenever a session
 * starts or ends (src/auth/authStore.ts), so the next person to sign in on a shared phone never
 * sees the last one's orders. Photos and the app's own code are not personal and stay cached.
 */
export async function clearSavedApiData(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      await caches.delete(API_CACHE)
    }
  } catch {
    // Cache Storage unavailable (some private modes): nothing was saved either.
  }
}
