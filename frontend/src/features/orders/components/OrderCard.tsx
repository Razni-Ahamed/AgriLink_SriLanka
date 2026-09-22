import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { UserAvatar } from '@/components/ui/UserAvatar'
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

  // The counterpart is whoever the caller is NOT — a buyer sees the farmer they ordered from,
  // a farmer sees the buyer who ordered from them.
  const counterpartName = role === 'Buyer' ? order.farmerName : order.buyerName
  const counterpartBusiness = role === 'Buyer' ? undefined : order.buyerBusinessName
  const counterpartRole = role === 'Buyer' ? 'Farmer' : 'Buyer'
  const counterpartPhotoUrl = role === 'Buyer' ? order.farmerPhotoUrl : order.buyerPhotoUrl

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
          <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
            <UserAvatar photoUrl={counterpartPhotoUrl} role={counterpartRole} name={counterpartName} size="sm" />
            <span className="min-w-0">
              {counterpartBusiness ? `${counterpartName} · ${counterpartBusiness}` : counterpartName}
            </span>
          </p>
          <p className="text-xs text-text-secondary">{order.cropType}</p>
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
