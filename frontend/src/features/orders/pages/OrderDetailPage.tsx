import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate, formatQuantity } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { useUiStore } from '@/lib/useUiStore'
import { useOrder, useOrderTransition } from '../hooks/useOrders'
import type { OrderStatus } from '@/types/dto/orders'

const statusVariant: Record<OrderStatus, 'warning' | 'success' | 'danger'> = {
  Confirmed: 'warning',
  Completed: 'success',
  Cancelled: 'danger',
}

export function OrderDetailPage() {
  const { t } = useTranslation(['orders', 'common'])
  const statusLabel = useStatusLabel()
  const { orderId } = useParams<{ orderId: string }>()
  const id = Number(orderId)
  const { data: order, isLoading } = useOrder(id)
  const transition = useOrderTransition()
  const addToast = useUiStore((state) => state.addToast)

  function handleTransition(action: 'complete' | 'cancel') {
    if (action === 'cancel' && !window.confirm(t('orders:detail.cancelConfirm'))) {
      return
    }
    transition.mutate(
      { orderId: id, action },
      {
        onSuccess: () =>
          addToast({
            type: 'success',
            message: t(action === 'complete' ? 'orders:detail.completed' : 'orders:detail.cancelled'),
          }),
        onError: () => addToast({ type: 'error', message: t('orders:detail.transitionError') }),
      },
    )
  }

  if (isLoading) {
    return <Skeleton className="h-48" />
  }

  if (!order) {
    return <p className="text-sm text-text-secondary">{t('orders:detail.notFound')}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/orders/mine"
        className="flex w-fit items-center gap-1 text-sm text-text-secondary hover:text-brand-forest"
      >
        <ArrowLeft size={14} />
        {t('orders:detail.back')}
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl text-text-primary">
            {t('orders:card.orderNumber', { id: order.orderId })}
          </h1>
          <p className="text-sm text-text-secondary">
            {t('orders:detail.placedOn', { date: formatDate(order.orderDate) })}
          </p>
        </div>
        <Badge variant={statusVariant[order.status]}>{statusLabel('order', order.status)}</Badge>
      </div>

      <Card className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-text-secondary">{t('orders:detail.quantity')}</p>
          <p className="font-mono text-lg text-text-primary">
            {t('common:units.kg', { value: formatQuantity(order.totalQuantity) })}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">{t('orders:detail.totalAmount')}</p>
          <p className="font-mono text-lg text-brand-forest">
            {t('common:units.rupees', { value: formatQuantity(order.totalAmount) })}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">{t('orders:detail.farmer')}</p>
          <p className="font-mono text-lg text-text-primary">#{order.farmerProfileId}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">{t('orders:detail.buyer')}</p>
          <p className="font-mono text-lg text-text-primary">#{order.buyerProfileId}</p>
        </div>
      </Card>

      {order.status === 'Confirmed' && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => handleTransition('complete')}
            isLoading={transition.isPending && transition.variables?.action === 'complete'}
            disabled={transition.isPending}
          >
            {t('orders:detail.markCompleted')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleTransition('cancel')}
            isLoading={transition.isPending && transition.variables?.action === 'cancel'}
            disabled={transition.isPending}
          >
            {t('orders:detail.cancelOrder')}
          </Button>
        </div>
      )}

      {order.completedAt && (
        <p className="text-sm text-text-secondary">
          {t('orders:detail.completedOn', { date: formatDate(order.completedAt) })}
        </p>
      )}
    </div>
  )
}
