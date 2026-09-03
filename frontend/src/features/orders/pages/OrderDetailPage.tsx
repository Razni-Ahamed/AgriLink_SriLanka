import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate, formatQuantity } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { useOrder } from '../hooks/useOrders'
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

      {order.completedAt && (
        <p className="text-sm text-text-secondary">
          {t('orders:detail.completedOn', { date: formatDate(order.completedAt) })}
        </p>
      )}
    </div>
  )
}
