import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/auth/authStore'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { OrderCard } from '../components/OrderCard'
import { useOrdersPage } from '../hooks/useOrders'
import { PhotoBanner } from '@/components/canopy/PhotoBanner'

export function MyOrdersPage() {
  const { t } = useTranslation('orders')
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching } = useOrdersPage(page)
  const orders = data?.items
  const role = useAuthStore((state) => state.role)

  return (
    <div className="flex flex-col gap-6">
      <PhotoBanner size="compact" photo="handover" title={t('list.title')} />

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

      {!isLoading && data && data.totalPages > 1 && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={(next) => {
            setPage(next)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          disabled={isFetching}
        />
      )}
    </div>
  )
}
