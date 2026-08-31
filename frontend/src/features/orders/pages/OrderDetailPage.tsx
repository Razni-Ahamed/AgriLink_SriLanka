import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate, formatQuantity } from '@/lib/utils'
import { useOrder } from '../hooks/useOrders'
import type { OrderStatus } from '@/types/dto/orders'

const statusVariant: Record<OrderStatus, 'warning' | 'success' | 'danger'> = {
  Confirmed: 'warning',
  Completed: 'success',
  Cancelled: 'danger',
}

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const id = Number(orderId)
  const { data: order, isLoading } = useOrder(id)

  if (isLoading) {
    return <Skeleton className="h-48" />
  }

  if (!order) {
    return <p className="text-sm text-text-secondary">Order not found.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/orders/mine"
        className="flex w-fit items-center gap-1 text-sm text-text-secondary hover:text-brand-forest"
      >
        <ArrowLeft size={14} />
        Back to orders
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl text-text-primary">Order #{order.orderId}</h1>
          <p className="text-sm text-text-secondary">Placed {formatDate(order.orderDate)}</p>
        </div>
        <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
      </div>

      <Card className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-text-secondary">Quantity</p>
          <p className="font-mono text-lg text-text-primary">
            {formatQuantity(order.totalQuantity)} kg
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Total amount</p>
          <p className="font-mono text-lg text-brand-forest">
            Rs. {formatQuantity(order.totalAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Farmer</p>
          <p className="font-mono text-lg text-text-primary">#{order.farmerProfileId}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">Buyer</p>
          <p className="font-mono text-lg text-text-primary">#{order.buyerProfileId}</p>
        </div>
      </Card>

      {order.completedAt && (
        <p className="text-sm text-text-secondary">Completed {formatDate(order.completedAt)}</p>
      )}
    </div>
  )
}
