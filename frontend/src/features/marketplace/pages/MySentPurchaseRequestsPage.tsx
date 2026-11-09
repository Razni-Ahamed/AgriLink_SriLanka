import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Storefront } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { parseApiError } from '@/lib/apiErrors'
import { useUiStore } from '@/lib/useUiStore'
import { PurchaseRequestCard } from '../components/PurchaseRequestCard'
import { useSentPurchaseRequests, useWithdrawPurchaseRequest } from '../hooks/usePurchaseRequests'

/** Buyer-only: what a buyer requested and where each request stands. A pending one can be withdrawn. */
export function MySentPurchaseRequestsPage() {
  const { t } = useTranslation(['marketplace', 'common'])
  const { data: requests, isLoading } = useSentPurchaseRequests()
  const withdraw = useWithdrawPurchaseRequest()
  const addToast = useUiStore((state) => state.addToast)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  function confirmWithdraw() {
    if (confirmingId === null) return
    withdraw.mutate(confirmingId, {
      onSuccess: () => {
        setConfirmingId(null)
        addToast({ type: 'success', message: t('marketplace:sentRequests.withdrawn') })
      },
      onError: (error) => {
        setConfirmingId(null)
        // The farmer may have answered in the meantime; the API says so.
        const parsed = parseApiError(error, t, {
          genericErrorKey: 'marketplace:sentRequests.withdrawError',
        })
        addToast({
          type: 'error',
          message: parsed.generalErrors[0] ?? t('marketplace:sentRequests.withdrawError'),
        })
      },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text-primary">
        {t('marketplace:sentRequests.title')}
      </h1>

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
          <p className="text-sm text-text-primary">{t('marketplace:sentRequests.empty')}</p>
          <p className="max-w-sm text-sm text-text-secondary">
            {t('marketplace:sentRequests.emptyHint')}
          </p>
          <Link
            to="/marketplace/browse"
            className="text-sm font-medium text-brand-forest hover:underline"
          >
            {t('marketplace:sentRequests.browseMarketplace')}
          </Link>
        </Card>
      )}

      {!isLoading && requests && requests.length > 0 && (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map((request) => (
            <StaggerList.Item key={request.requestId}>
              <PurchaseRequestCard
                request={request}
                onWithdraw={() => setConfirmingId(request.requestId)}
              />
            </StaggerList.Item>
          ))}
        </StaggerList>
      )}

      <Modal
        open={confirmingId !== null}
        onClose={() => setConfirmingId(null)}
        title={t('marketplace:sentRequests.withdrawConfirmTitle')}
      >
        <p className="text-sm text-text-secondary">
          {t('marketplace:sentRequests.withdrawConfirmBody')}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmingId(null)}>
            {t('marketplace:sentRequests.keep')}
          </Button>
          <Button variant="danger" isLoading={withdraw.isPending} onClick={confirmWithdraw}>
            {t('marketplace:sentRequests.withdraw')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
