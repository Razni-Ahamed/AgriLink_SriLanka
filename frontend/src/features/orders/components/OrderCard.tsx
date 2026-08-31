import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { OrderTruckIcon } from '@/components/ui/icons/custom'
import { formatDate, formatQuantity } from '@/lib/utils'
import type { Role } from '@/types/common'
import type { OrderResponse, OrderStatus } from '@/types/dto/orders'

const statusVariant: Record<OrderStatus, 'warning' | 'success' | 'danger'> = {
  Confirmed: 'warning',
  Completed: 'success',
  Cancelled: 'danger',
}

export function OrderCard({ order, role }: { order: OrderResponse; role: Role | null }) {
  // OrderResponse only carries counterpart profile ids, not names — there's no
  // endpoint yet to resolve a FarmerProfileId/BuyerProfileId to a display name.
  const counterpart =
    role === 'Buyer' ? `Farmer #${order.farmerProfileId}` : `Buyer #${order.buyerProfileId}`

  return (
    <Link to={`/orders/${order.orderId}`}>
      <Card interactive className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <IconBadge tone="terracotta">
            <OrderTruckIcon size={20} />
          </IconBadge>
          <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
        </div>

        <div>
          <h3 className="font-display text-lg text-text-primary">Order #{order.orderId}</h3>
          <p className="text-sm text-text-secondary">{counterpart}</p>
        </div>

        <div className="flex items-baseline justify-between font-mono text-sm">
          <span className="text-text-secondary">{formatQuantity(order.totalQuantity)} kg</span>
          <span className="text-brand-forest">Rs. {formatQuantity(order.totalAmount)}</span>
        </div>

        <p className="font-mono text-xs text-text-secondary">{formatDate(order.orderDate)}</p>
      </Card>
    </Link>
  )
}
