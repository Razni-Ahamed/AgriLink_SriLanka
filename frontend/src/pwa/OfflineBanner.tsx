import { CloudSlash } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { useOnlineStatus } from './useOnlineStatus'

/** A slim notice under the header while there is no connection, so saved data isn't mistaken for
 *  live data and nobody wonders why a button does nothing. */
export function OfflineBanner() {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div className="mx-auto mt-2 max-w-7xl px-2 sm:px-4" role="status">
      <p className="glass flex items-center gap-2 rounded-2xl px-4 py-2 text-sm text-text-primary">
        <CloudSlash size={18} weight="duotone" className="shrink-0 text-state-info" />
        {t('offline.banner')}
      </p>
    </div>
  )
}
