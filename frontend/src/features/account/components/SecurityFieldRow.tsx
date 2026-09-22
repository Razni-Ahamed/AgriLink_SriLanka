import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import type { ChangeRequestSummary } from '../api/securityApi'

interface SecurityFieldRowProps {
  label: string
  /** The value currently in effect — a pending request never changes this. */
  currentValue: string | null | undefined
  /** direct: saves immediately. request: needs an Officer's/Admin's approval. */
  mode: 'direct' | 'request'
  unlocked: boolean
  /** Officer/Admin phone only — an empty submission clears the value instead of being a no-op. */
  clearable?: boolean
  inputType?: 'text' | 'tel' | 'email'
  onSubmit: (value: string) => void
  isSubmitting?: boolean
  pending?: ChangeRequestSummary
  onWithdraw?: (requestId: number) => void
  isWithdrawing?: boolean
  recentDecided?: ChangeRequestSummary[]
  /** Called on every keystroke, so the parent can reset the 5-minute unlock timer. */
  onActivity?: () => void
}

/** One identity field on the Security tab: read-only value, a pending-approval badge with
 *  Withdraw, recent rejections, and — once unlocked — an input with the right save action. */
export function SecurityFieldRow({
  label,
  currentValue,
  mode,
  unlocked,
  clearable,
  inputType = 'text',
  onSubmit,
  isSubmitting,
  pending,
  onWithdraw,
  isWithdrawing,
  recentDecided,
  onActivity,
}: SecurityFieldRowProps) {
  const { t } = useTranslation(['auth', 'common'])
  const [value, setValue] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = value.trim()
    // Leaving the field empty keeps the current value — a no-op, not an error, except a
    // clearable field (Officer/Admin phone), where an empty submission means "clear it".
    if (trimmed.length === 0 && !clearable) {
      return
    }
    onSubmit(trimmed)
    setValue('')
  }

  const mostRecentRejection = recentDecided?.find((r) => r.status === 'Rejected')

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-text-secondary">{label}</p>
          <p className="text-sm text-text-primary">
            {currentValue || <span className="text-text-secondary">{t('auth:profile.general.notSet')}</span>}
          </p>
        </div>
        {pending && <Badge variant="warning">{t('auth:profile.security.pendingApproval')}</Badge>}
      </div>

      {pending && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-harvest/10 px-3 py-2 text-sm">
          <span className="text-text-primary">
            {t('auth:profile.security.pendingValue', { value: pending.newValue })}
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isWithdrawing}
            onClick={() => onWithdraw?.(pending.requestId)}
          >
            {t('auth:profile.security.withdraw')}
          </Button>
        </div>
      )}

      {mostRecentRejection && (
        <p className="text-xs text-state-danger">
          {t('auth:profile.security.recentlyRejected', {
            value: mostRecentRejection.newValue,
            date: formatDate(mostRecentRejection.decidedAt ?? mostRecentRejection.requestedAt),
            reason: mostRecentRejection.rejectionReason ?? '',
          })}
        </p>
      )}

      {unlocked && !pending && (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
          <Input
            label={t('auth:profile.security.newValueLabel', { field: label })}
            type={inputType}
            placeholder={currentValue ?? ''}
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              onActivity?.()
            }}
            className="min-w-0 flex-1"
          />
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {mode === 'direct' ? t('auth:profile.security.save') : t('auth:profile.security.submitForApproval')}
          </Button>
        </form>
      )}

      {unlocked && !pending && mode === 'request' && (
        <p className="text-xs text-text-secondary">{t('auth:profile.security.approvalNote')}</p>
      )}
    </div>
  )
}
