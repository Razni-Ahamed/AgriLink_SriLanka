import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { OrderTruckIcon } from '@/components/ui/icons/custom'
import { formatDate, formatQuantity } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import type { Role } from '@/types/common'
import type { OrderResponse, OrderStatus } from '@/types/dto/orders'

const statusVariant: Record<OrderStatus, 'warning' | 'success' | 'danger'> = {
  Confirmed: 'warning',
  Completed: 'success',
  Cancelled: 'danger',
}

export function OrderCard({ order, role }: { order: OrderResponse; role: Role | null }) {
  const { t } = useTranslation(['orders', 'common'])
  const statusLabel = useStatusLabel()

  // OrderResponse only carries counterpart profile ids, not names — there's no
  // endpoint yet to resolve a FarmerProfileId/BuyerProfileId to a display name.
  const counterpart =
    role === 'Buyer'
      ? t('orders:card.farmerCounterpart', { id: order.farmerProfileId })
      : t('orders:card.buyerCounterpart', { id: order.buyerProfileId })

  return (
    <Link to={`/orders/${order.orderId}`}>
      <Card interactive className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <IconBadge tone="terracotta">
            <OrderTruckIcon size={20} />
          </IconBadge>
          <Badge variant={statusVariant[order.status]}>{statusLabel('order', order.status)}</Badge>
        </div>

        <div>
          <h3 className="font-display text-lg text-text-primary">
            {t('orders:card.orderNumber', { id: order.orderId })}
          </h3>
          <p className="text-sm text-text-secondary">{counterpart}</p>
        </div>

        <div className="flex items-baseline justify-between font-mono text-sm">
          <span className="text-text-secondary">
            {t('common:units.kg', { value: formatQuantity(order.totalQuantity) })}
          </span>
          <span className="text-brand-forest">
            {t('common:units.rupees', { value: formatQuantity(order.totalAmount) })}
          </span>
        </div>

        <p className="font-mono text-xs text-text-secondary">{formatDate(order.orderDate)}</p>
      </Card>
    </Link>
  )
}
