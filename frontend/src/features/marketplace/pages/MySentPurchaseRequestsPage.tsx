import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { PurchaseRequestCard } from '../components/PurchaseRequestCard'
import { useSentPurchaseRequests } from '../hooks/usePurchaseRequests'

/** Buyer-only, read-only: what a buyer requested and where each request stands. */
export function MySentPurchaseRequestsPage() {
  const { t } = useTranslation('marketplace')
  const { data: requests, isLoading } = useSentPurchaseRequests()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text-primary">{t('sentRequests.title')}</h1>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      )}

      {!isLoading && requests && requests.length === 0 && (
        <p className="text-sm text-text-secondary">{t('sentRequests.empty')}</p>
      )}

      {!isLoading && requests && requests.length > 0 && (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map((request) => (
            <StaggerList.Item key={request.requestId}>
              <PurchaseRequestCard request={request} />
            </StaggerList.Item>
          ))}
        </StaggerList>
      )}
    </div>
  )
}
