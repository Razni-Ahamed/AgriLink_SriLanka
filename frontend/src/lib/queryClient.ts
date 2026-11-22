import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
      // Try the request even when the browser says it is offline: the service worker answers
      // listings, orders and a farmer's own records from what it saved (src/sw/sw.ts). The default
      // ('online') would never ask, and those screens would sit on a loading state instead.
      networkMode: 'offlineFirst',
    },
  },
})
