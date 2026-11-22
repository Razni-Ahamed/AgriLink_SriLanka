import { QueryClient, type QueryKey } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Queries whose answers the service worker saves for offline viewing (CACHEABLE_PATHS in
 * src/pwa/apiCachePolicy.ts): listings, orders, purchase requests, the farmer's own issues, advice,
 * crops and farms. These try the request even when the browser says it is offline, so the worker
 * can answer from what it saved; with the default ('online') they would never ask and sit loading.
 *
 * Everything else (notifications, chat, officer and admin queues) keeps the default: offline it
 * pauses and resumes when the signal returns, instead of failing and showing an error.
 */
export const SAVED_FOR_OFFLINE: readonly QueryKey[] = [
  ['harvests'],
  ['orders'],
  ['purchase-requests'],
  ['issues', 'mine'],
  ['advisories'],
  ['crops'],
  ['farms'],
  ['farmer'],
]

for (const queryKey of SAVED_FOR_OFFLINE) {
  queryClient.setQueryDefaults(queryKey, { networkMode: 'offlineFirst' })
}
