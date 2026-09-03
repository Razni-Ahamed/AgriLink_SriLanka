import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/auth/authStore'
import { useUiStore } from '@/lib/useUiStore'
import { formatDate, formatQuantity } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { PurchaseRequestForm } from '../components/PurchaseRequestForm'
import { useHarvest } from '../hooks/useHarvests'
import { useCreatePurchaseRequest } from '../hooks/usePurchaseRequests'

const statusVariant = {
  Active: 'success',
  Sold: 'neutral',
  Cancelled: 'danger',
} as const

export function HarvestDetailPage() {
  const { t } = useTranslation(['marketplace', 'common'])
  const statusLabel = useStatusLabel()
  const { harvestId } = useParams<{ harvestId: string }>()
  const id = Number(harvestId)
  const role = useAuthStore((state) => state.role)
  const addToast = useUiStore((state) => state.addToast)

  const { data: harvest, isLoading } = useHarvest(id)
  const createRequest = useCreatePurchaseRequest()

  const [isRequestOpen, setRequestOpen] = useState(false)
  const [requestSent, setRequestSent] = useState(false)

  if (isLoading) {
    return <Skeleton className="h-56" />
  }

  if (!harvest) {
    return <p className="text-sm text-text-secondary">{t('marketplace:detail.notFound')}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/marketplace/browse"
        className="flex w-fit items-center gap-1 text-sm text-text-secondary hover:text-brand-forest"
      >
        <ArrowLeft size={14} />
        {t('marketplace:detail.back')}
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl text-text-primary">{harvest.cropType}</h1>
          <p className="text-sm text-text-secondary">
            {harvest.variety || t('marketplace:detail.noVariety')}
          </p>
        </div>
        <Badge variant={statusVariant[harvest.status]}>
          {statusLabel('harvest', harvest.status)}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="flex items-center gap-1 text-text-secondary">
            <MapPin size={14} />
            {t('marketplace:detail.district')}
          </dt>
          <dd className="font-mono text-text-primary">{harvest.district}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-text-secondary">
            <Calendar size={14} />
            {t('marketplace:detail.harvestDate')}
          </dt>
          <dd className="font-mono text-text-primary">{formatDate(harvest.harvestDate)}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">{t('marketplace:detail.location')}</dt>
          <dd className="font-mono text-text-primary">{harvest.location}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">{t('marketplace:detail.availableQuantity')}</dt>
          <dd className="font-mono tabular-nums text-text-primary">
            {formatQuantity(harvest.availableQuantity)}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">{t('marketplace:detail.pricePerUnit')}</dt>
          <dd className="font-mono tabular-nums text-brand-forest">
            {t('common:units.rupees', { value: formatQuantity(harvest.pricePerUnit) })}
          </dd>
        </div>
      </dl>

      {role === 'Buyer' && harvest.status === 'Active' && (
        <Button className="w-fit" onClick={() => setRequestOpen(true)}>
          {t('marketplace:detail.requestPurchase')}
        </Button>
      )}

      <Modal
        open={isRequestOpen}
        onClose={() => {
          setRequestOpen(false)
          setRequestSent(false)
        }}
        title={t('marketplace:detail.requestPurchase')}
      >
        {requestSent ? (
          <p className="text-sm text-text-primary">{t('marketplace:detail.requestSent')}</p>
        ) : (
          <PurchaseRequestForm
            availableQuantity={harvest.availableQuantity}
            isSubmitting={createRequest.isPending}
            onSubmit={(values) =>
              createRequest.mutate(
                { harvestId: harvest.harvestId, ...values },
                {
                  onSuccess: () => {
                    setRequestSent(true)
                    addToast({ type: 'success', message: t('marketplace:requests.sent') })
                  },
                  onError: () =>
                    addToast({ type: 'error', message: t('marketplace:requests.sendError') }),
                },
              )
            }
          />
        )}
      </Modal>
    </div>
  )
}
