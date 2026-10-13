import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Shake } from '@/components/ui/motion/Shake'
import { FlashOnSuccess } from '@/components/ui/motion/FlashOnSuccess'
import { formatDate, formatQuantity } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { useAuthStore } from '@/auth/authStore'
import { StartChatButton } from '@/features/messages/components/StartChatButton'
import type { PurchaseRequestResponse } from '@/types/dto/purchaseRequests'

const statusVariant = {
  Pending: 'info',
  Accepted: 'success',
  Declined: 'danger',
  Cancelled: 'neutral',
} as const

interface PurchaseRequestCardProps {
  request: PurchaseRequestResponse
  /** Omit both to render a read-only card — used for a buyer's own sent requests. */
  onAccept?: () => void
  onDecline?: () => void
  isResponding?: boolean
}

export function PurchaseRequestCard({
  request,
  onAccept,
  onDecline,
  isResponding,
}: PurchaseRequestCardProps) {
  const { t } = useTranslation(['marketplace', 'common', 'messages'])
  const statusLabel = useStatusLabel()
  const role = useAuthStore((state) => state.role)
  const [justAccepted, setJustAccepted] = useState(false)
  const [justDeclined, setJustDeclined] = useState(false)

  function handleAccept() {
    setJustAccepted(true)
    onAccept?.()
  }

  function handleDecline() {
    setJustDeclined(true)
    onDecline?.()
  }

  return (
    <Shake trigger={justDeclined}>
      <FlashOnSuccess trigger={justAccepted}>
        <Card className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display text-lg text-text-primary">{request.cropType}</h3>
              <span className="font-mono tabular-nums text-xs text-text-secondary">
                {t('marketplace:requests.requestNumber', { id: request.requestId })}
              </span>
            </div>
            <Badge variant={statusVariant[request.status]}>
              {statusLabel('request', request.status)}
            </Badge>
          </div>

          <p className="text-sm text-text-secondary">
            {t('marketplace:requests.from', {
              name: request.buyerBusinessName
                ? `${request.buyerName} · ${request.buyerBusinessName}`
                : request.buyerName,
            })}
          </p>

          <p className="font-mono tabular-nums text-brand-forest">
            {t('marketplace:requests.unitsRequested', {
              quantity: formatQuantity(request.requestedQuantity),
            })}
          </p>

          <p className="font-mono tabular-nums text-sm text-text-secondary">
            {t('common:units.rupeesPerUnit', { value: formatQuantity(request.pricePerUnit) })}
            {' · '}
            {request.district}
          </p>

          {request.message && <p className="text-sm text-text-secondary">{request.message}</p>}

          <p className="text-xs text-text-secondary">{formatDate(request.createdAt)}</p>

          {/* Talk it over before or after deciding; a declined or withdrawn request's chat is closed. */}
          {(request.status === 'Pending' || request.status === 'Accepted') &&
            (role === 'Farmer' || role === 'Buyer') && (
              <StartChatButton
                subject={{ kind: 'Deal', requestId: request.requestId }}
                label={t(role === 'Farmer' ? 'messages:start.messageBuyer' : 'messages:start.messageFarmer')}
                variant="ghost"
              />
            )}

          {request.status === 'Pending' && onAccept && onDecline && (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAccept} isLoading={isResponding && justAccepted}>
                {t('common:actions.accept')}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleDecline}
                isLoading={isResponding && justDeclined}
              >
                {t('common:actions.decline')}
              </Button>
            </div>
          )}
        </Card>
      </FlashOnSuccess>
    </Shake>
  )
}
