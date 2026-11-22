import { useEffect } from 'react'
import { ArrowClockwise } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/Button'
import { useUiStore } from '@/lib/useUiStore'

/** How often an open tab asks whether a new version has been deployed. */
const UPDATE_CHECK_MS = 60 * 60 * 1000

/**
 * Registers the service worker and offers new versions.
 *
 * A new deploy is downloaded in the background and then waits: the notice asks before reloading,
 * so a farmer halfway through a listing or an issue report never loses it to a surprise reload.
 * Until they tap it (or close every AgriLink tab), the version they opened keeps working, its
 * page code included, since the service worker still holds it.
 */
export function UpdatePrompt() {
  const { t } = useTranslation()
  const addToast = useUiStore((state) => state.addToast)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine && document.visibilityState === 'visible') {
          void registration.update().catch(() => undefined)
        }
      }
      setInterval(check, UPDATE_CHECK_MS)
      document.addEventListener('visibilitychange', check)
    },
  })

  // The first visit that installs the worker: say once that the app now opens without a signal.
  useEffect(() => {
    if (!offlineReady) return
    addToast({ type: 'info', message: t('pwa.offlineReady') })
    setOfflineReady(false)
  }, [offlineReady, setOfflineReady, addToast, t])

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="fixed inset-x-2 bottom-[calc(max(0.5rem,env(safe-area-inset-bottom))+4.5rem)] z-50 mx-auto max-w-md xl:bottom-4"
    >
      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg">
        <p className="flex-1 text-sm text-text-primary">{t('pwa.updateReady')}</p>
        <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
          {t('pwa.later')}
        </Button>
        <Button size="sm" onClick={() => void updateServiceWorker(true)}>
          <ArrowClockwise size={16} weight="bold" />
          {t('pwa.reload')}
        </Button>
      </div>
    </div>
  )
}
