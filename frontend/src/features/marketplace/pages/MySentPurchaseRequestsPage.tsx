import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Storefront } from '@phosphor-icons/react'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
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
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <IconBadge tone="forest">
            <Storefront size={20} weight="duotone" />
          </IconBadge>
          <p className="text-sm text-text-primary">{t('sentRequests.empty')}</p>
          <p className="max-w-sm text-sm text-text-secondary">{t('sentRequests.emptyHint')}</p>
          <Link
            to="/marketplace/browse"
            className="text-sm font-medium text-brand-forest hover:underline"
          >
            {t('sentRequests.browseMarketplace')}
          </Link>
        </Card>
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
