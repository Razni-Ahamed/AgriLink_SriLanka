import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Textarea } from '@/components/ui/Textarea'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { parseApiError } from '@/lib/apiErrors'
import { useUiStore } from '@/lib/useUiStore'
import { formatDate } from '@/lib/utils'
import type { PendingChangeRequestResponse } from '../api/profileChangeRequestsApi'
import { useApproveChangeRequest, useRejectChangeRequest } from '../hooks/useProfileChangeRequests'

/** One pending identity-detail change (full name / NIC / email) in the approval queue. */
export function ProfileChangeRequestCard({ request }: { request: PendingChangeRequestResponse }) {
  const { t } = useTranslation(['registrations', 'common'])
  const addToast = useUiStore((state) => state.addToast)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const approve = useApproveChangeRequest()
  const reject = useRejectChangeRequest()

  function closeApprove() {
    // The re-authenticated password is only ever needed for this one submit — never held any
    // longer than that, exactly like the Security tab's own unlock password.
    setIsApproving(false)
    setPassword('')
    setPasswordError(null)
  }

  async function handleApproveSubmit(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)
    try {
      await approve.mutateAsync({ requestId: request.requestId, currentPassword: password })
      addToast({ type: 'success', message: t('pending.changes.approved') })
      closeApprove()
    } catch (error) {
      const parsed = parseApiError(error, t, { genericErrorKey: 'registrations:pending.changes.approveError' })
      setPasswordError(parsed.generalErrors[0] ?? t('pending.changes.approveError'))
    }
  }

  async function handleReject() {
    try {
      await reject.mutateAsync({ requestId: request.requestId, reason })
      addToast({ type: 'success', message: t('pending.changes.rejected') })
      setIsRejecting(false)
      setReason('')
    } catch {
      addToast({ type: 'error', message: t('pending.changes.rejectError') })
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar photoUrl={request.profilePhotoUrl} role={request.role} name={request.fullName} size="sm" />
          <div className="min-w-0">
            <h3 className="truncate font-display text-base text-text-primary">{request.fullName}</h3>
            <p className="truncate text-xs text-text-secondary">
              {request.username}
              {request.district && ` · ${request.district}`}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-xs text-text-secondary">
          {t('pending.changes.requestedOn', { date: formatDate(request.requestedAt) })}
        </span>
      </div>

      <dl className="flex flex-col gap-1 text-sm">
        <dt className="text-xs text-text-secondary">
          {t(`pending.changes.fieldLabel.${request.field}`)}
        </dt>
        <dd className="flex flex-wrap items-baseline gap-x-2 text-text-primary">
          <span className="text-text-secondary line-through">
            {t('pending.changes.oldValue', { value: request.oldValue })}
          </span>
          <span className="font-medium">{t('pending.changes.newValue', { value: request.newValue })}</span>
        </dd>
      </dl>

      {isRejecting ? (
        <div className="flex flex-col gap-2">
          <Textarea
            label={t('pending.changes.rejectPrompt')}
            placeholder={t('pending.changes.rejectPlaceholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsRejecting(false)}>
              {t('pending.changes.cancel')}
            </Button>
            <Button
              variant="danger"
              disabled={!reason.trim() || reject.isPending}
              onClick={handleReject}
            >
              {t('pending.changes.rejectSubmit')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setIsRejecting(true)}>
            {t('pending.changes.reject')}
          </Button>
          <Button onClick={() => setIsApproving(true)}>{t('pending.changes.approve')}</Button>
        </div>
      )}

      <Modal open={isApproving} onClose={closeApprove} title={t('pending.changes.approveTitle')}>
        <form onSubmit={handleApproveSubmit} className="flex flex-col gap-3">
          <p className="text-sm text-text-secondary">{t('pending.changes.approvePrompt')}</p>
          <PasswordInput
            label={t('common:fields.password')}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={passwordError ?? undefined}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeApprove}>
              {t('pending.changes.cancel')}
            </Button>
            <Button type="submit" isLoading={approve.isPending}>
              {t('pending.changes.approveConfirm')}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}
