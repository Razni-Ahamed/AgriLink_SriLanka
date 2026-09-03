import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import '@/i18n/config'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/auth/authStore'
import { hydrateLanguage } from '@/lib/useLanguageStore'
import { hydrateTheme } from '@/lib/useUiStore'
import { router } from '@/app/routes'

function App() {
  const hydrate = useAuthStore((state) => state.hydrate)

  useEffect(() => {
    hydrate()
    hydrateTheme()
    hydrateLanguage()
  }, [hydrate])

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export default App
