import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Shake } from '@/components/ui/motion/Shake'
import { FlashOnSuccess } from '@/components/ui/motion/FlashOnSuccess'
import { formatDate, formatQuantity } from '@/lib/utils'
import type { PurchaseRequestResponse } from '@/types/dto/purchaseRequests'

const statusVariant = {
  Pending: 'info',
  Accepted: 'success',
  Declined: 'danger',
  Cancelled: 'neutral',
} as const

interface PurchaseRequestCardProps {
  request: PurchaseRequestResponse
  onAccept: () => void
  onDecline: () => void
  isResponding?: boolean
}

export function PurchaseRequestCard({
  request,
  onAccept,
  onDecline,
  isResponding,
}: PurchaseRequestCardProps) {
  const [justAccepted, setJustAccepted] = useState(false)
  const [justDeclined, setJustDeclined] = useState(false)

  function handleAccept() {
    setJustAccepted(true)
    onAccept()
  }

  function handleDecline() {
    setJustDeclined(true)
    onDecline()
  }

  return (
    <Shake trigger={justDeclined}>
      <FlashOnSuccess trigger={justAccepted}>
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono tabular-nums text-sm text-text-secondary">
              Request #{request.requestId}
            </span>
            <Badge variant={statusVariant[request.status]}>{request.status}</Badge>
          </div>

          <p className="font-mono tabular-nums text-brand-forest">
            {formatQuantity(request.requestedQuantity)} units requested
          </p>

          {request.message && <p className="text-sm text-text-secondary">{request.message}</p>}

          <p className="text-xs text-text-secondary">{formatDate(request.createdAt)}</p>

          {request.status === 'Pending' && (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAccept} isLoading={isResponding && justAccepted}>
                Accept
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleDecline}
                isLoading={isResponding && justDeclined}
              >
                Decline
              </Button>
            </div>
          )}
        </Card>
      </FlashOnSuccess>
    </Shake>
  )
}
