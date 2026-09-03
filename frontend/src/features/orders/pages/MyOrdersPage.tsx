import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/auth/authStore'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { OrderCard } from '../components/OrderCard'
import { useOrders } from '../hooks/useOrders'

export function MyOrdersPage() {
  const { t } = useTranslation('orders')
  const { data: orders, isLoading } = useOrders()
  const role = useAuthStore((state) => state.role)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text-primary">{t('list.title')}</h1>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      )}

      {!isLoading && orders && orders.length === 0 && (
        <p className="text-sm text-text-secondary">{t('list.empty')}</p>
      )}

      {!isLoading && orders && orders.length > 0 && (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <StaggerList.Item key={order.orderId}>
              <OrderCard order={order} role={role} />
            </StaggerList.Item>
          ))}
        </StaggerList>
      )}
    </div>
  )
}
