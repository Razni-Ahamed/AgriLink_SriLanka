import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { QueryClientProvider } from '@tanstack/react-query'
import '@/i18n/config'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/auth/authStore'
import { hydrateLanguage } from '@/lib/useLanguageStore'
import { hydrateMotion, hydrateTheme, useUiStore } from '@/lib/useUiStore'
import { useGlassHighlight } from '@/lib/useGlassHighlight'
import { router } from '@/app/routes'
import { UpdatePrompt } from '@/pwa/UpdatePrompt'

function App() {
  const hydrate = useAuthStore((state) => state.hydrate)
  const motion = useUiStore((state) => state.motion)
  useGlassHighlight()

  useEffect(() => {
    hydrate()
    hydrateTheme()
    hydrateMotion()
    hydrateLanguage()
  }, [hydrate])

  return (
    <QueryClientProvider client={queryClient}>
      {/* With motion off, every motion/react animation jumps straight to its end. With `user`,
          motion/react still honours the device's own reduced-motion setting. */}
      <MotionConfig reducedMotion={motion === 'off' ? 'always' : 'user'}>
        <RouterProvider router={router} />
        <UpdatePrompt />
      </MotionConfig>
    </QueryClientProvider>
  )
}

export default App
