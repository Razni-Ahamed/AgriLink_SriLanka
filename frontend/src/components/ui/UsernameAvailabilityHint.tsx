import { useTranslation } from 'react-i18next'
import { CheckCircle, XCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { UsernameAvailabilityStatus } from '@/lib/useUsernameAvailability'
import { Spinner } from './Spinner'

interface UsernameAvailabilityHintProps {
  id?: string
  status: UsernameAvailabilityStatus
}

/**
 * The live verdict under a username field. Until there is a verdict (nothing typed, the user's own
 * current name, or a name that breaks the format rules) it shows the rules themselves; the field's
 * own validation message says which rule failed. aria-live so a screen reader hears the result once
 * typing pauses.
 */
export function UsernameAvailabilityHint({ id, status }: UsernameAvailabilityHintProps) {
  const { t } = useTranslation('common')

  const content = (() => {
    switch (status) {
      case 'checking':
        return (
          <>
            <Spinner size="sm" />
            {t('username.checking')}
          </>
        )
      case 'available':
        return (
          <>
            <CheckCircle size={16} weight="fill" aria-hidden="true" />
            {t('username.available')}
          </>
        )
      case 'taken':
        return (
          <>
            <XCircle size={16} weight="fill" aria-hidden="true" />
            {t('username.taken')}
          </>
        )
      case 'reserved':
        return (
          <>
            <XCircle size={16} weight="fill" aria-hidden="true" />
            {t('username.reserved')}
          </>
        )
      case 'error':
        return t('username.checkFailed')
      default:
        return t('username.hint')
    }
  })()

  const tone =
    status === 'available'
      ? 'text-state-success'
      : status === 'taken' || status === 'reserved'
        ? 'text-state-danger'
        : 'text-text-secondary'

  return (
    <p id={id} aria-live="polite" className={cn('mt-1 flex min-h-5 items-center gap-1.5 text-xs', tone)}>
      {content}
    </p>
  )
}
