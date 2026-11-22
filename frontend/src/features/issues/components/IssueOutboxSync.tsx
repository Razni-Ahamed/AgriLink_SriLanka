import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/lib/useUiStore'
import { createIssue } from '../api/issuesApi'
import { useOutboxOwner } from '../hooks/useIssueOutbox'
import { sendQueuedIssueReports } from '../lib/issueOutbox'

/**
 * Sends issue reports saved while offline: when the app opens with a signed-in farmer, and again
 * whenever the connection comes back. Renders nothing.
 */
export function IssueOutboxSync() {
  const { t } = useTranslation('issues')
  const ownerId = useOutboxOwner()
  const queryClient = useQueryClient()
  const addToast = useUiStore((state) => state.addToast)

  useEffect(() => {
    if (!ownerId) return

    const flush = () => {
      if (!navigator.onLine) return
      void sendQueuedIssueReports(ownerId, createIssue)
        .then(({ sent, rejected }) => {
          if (sent > 0) {
            void queryClient.invalidateQueries({ queryKey: ['issues'] })
            addToast({ type: 'success', message: t('outbox.sent', { count: sent }) })
          }
          if (rejected > 0) {
            addToast({ type: 'error', message: t('outbox.rejected', { count: rejected }) })
          }
        })
        .catch(() => undefined)
    }

    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [ownerId, queryClient, addToast, t])

  return null
}
