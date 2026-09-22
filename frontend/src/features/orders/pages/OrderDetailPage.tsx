import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, EnvelopeSimple, Phone } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate, formatQuantity } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { useUiStore } from '@/lib/useUiStore'
import { useOrder, useOrderTransition } from '../hooks/useOrders'
import type { OrderResponse, OrderStatus } from '@/types/dto/orders'

const statusVariant: Record<OrderStatus, 'warning' | 'success' | 'danger'> = {
  Confirmed: 'warning',
  Completed: 'success',
  Cancelled: 'danger',
}

interface ContactCardProps {
  title: string
  name: string
  business?: string
  district: string
  phone?: string | null
  email: string
}

/** Phone and email as tappable tel:/mailto: links; when a phone is missing, email only. */
function ContactCard({ title, name, business, district, phone, email }: ContactCardProps) {
  const { t } = useTranslation('orders')

  return (
    <Card className="flex flex-col gap-2">
      <p className="text-xs text-text-secondary">{title}</p>
      <p className="font-display text-base text-text-primary">{name}</p>
      {business && <p className="text-sm text-text-secondary">{business}</p>}
      <p className="text-sm text-text-secondary">{district}</p>
      <div className="mt-1 flex flex-col gap-1 text-sm">
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-1.5 text-brand-forest hover:underline"
          >
            <Phone size={14} weight="duotone" />
            {phone}
          </a>
        ) : (
          <span className="flex items-center gap-1.5 text-text-secondary/70">
            <Phone size={14} weight="duotone" />
            {t('detail.noPhoneOnFile')}
          </span>
        )}
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-1.5 text-brand-forest hover:underline"
        >
          <EnvelopeSimple size={14} weight="duotone" />
          {email}
        </a>
      </div>
    </Card>
  )
}

function OrderContacts({ order }: { order: OrderResponse }) {
  const { t } = useTranslation('orders')

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <ContactCard
        title={t('detail.farmer')}
        name={order.farmerName}
        district={order.farmerDistrict}
        phone={order.farmerPhone}
        email={order.farmerEmail}
      />
      <ContactCard
        title={t('detail.buyer')}
        name={order.buyerName}
        business={order.buyerBusinessName}
        district={order.buyerDistrict}
        phone={order.buyerPhone}
        email={order.buyerEmail}
      />
    </div>
  )
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
          <p className="text-xs text-text-secondary">{t('orders:detail.crop')}</p>
          <p className="font-display text-lg text-text-primary">{order.cropType}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">{t('orders:detail.quantity')}</p>
          <p className="font-mono text-lg text-text-primary">
            {t('common:units.kg', { value: formatQuantity(order.totalQuantity) })}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">{t('orders:detail.pricePerUnit')}</p>
          <p className="font-mono text-lg text-text-primary">
            {t('common:units.rupeesPerUnit', { value: formatQuantity(order.pricePerUnit) })}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary">{t('orders:detail.totalAmount')}</p>
          <p className="font-mono text-lg text-brand-forest">
            {t('common:units.rupees', { value: formatQuantity(order.totalAmount) })}
          </p>
        </div>
      </Card>

      <div>
        <h2 className="mb-2 font-display text-lg text-text-primary">{t('orders:detail.contact')}</h2>
        <OrderContacts order={order} />
      </div>

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
