import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Warning } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { useAuthStore } from '@/auth/authStore'
import { useUiStore } from '@/lib/useUiStore'
import { formatDate, formatQuantity } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { HarvestListingForm } from '../components/HarvestListingForm'
import { useCreateHarvest, useHarvests, useUpdateHarvest } from '../hooks/useHarvests'
import type { HarvestListingResponse, HarvestStatus } from '@/types/dto/harvests'

const statusVariant = {
  Active: 'success',
  Sold: 'neutral',
  Cancelled: 'danger',
} as const

const statusOptions: HarvestStatus[] = ['Active', 'Sold', 'Cancelled']

function MyListingCard({ harvest }: { harvest: HarvestListingResponse }) {
  const { t } = useTranslation(['marketplace', 'common'])
  const statusLabel = useStatusLabel()
  const updateHarvest = useUpdateHarvest(harvest.harvestId)
  const addToast = useUiStore((state) => state.addToast)

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-lg text-text-primary">{harvest.cropType}</h3>
          <p className="text-sm text-text-secondary">{harvest.variety}</p>
        </div>
        <Badge variant={statusVariant[harvest.status]}>
          {statusLabel('harvest', harvest.status)}
        </Badge>
      </div>

      <p className="font-mono tabular-nums text-brand-forest">
        {t('common:units.rupeesPerUnit', { value: formatQuantity(harvest.pricePerUnit) })}
      </p>
      <p className="font-mono tabular-nums text-sm text-text-secondary">
        {t('marketplace:listings.availableOf', {
          available: formatQuantity(harvest.availableQuantity),
          total: formatQuantity(harvest.quantity),
        })}
      </p>
      <p className="text-xs text-text-secondary">
        {t('marketplace:listings.harvestedOn', { date: formatDate(harvest.harvestDate) })}
      </p>

      <Select
        label={t('common:fields.status')}
        value={harvest.status}
        disabled={updateHarvest.isPending}
        onChange={(event) => {
          updateHarvest.mutate(
            { status: event.target.value as HarvestStatus },
            {
              onSuccess: () =>
                addToast({ type: 'success', message: t('marketplace:listings.updated') }),
              onError: () =>
                addToast({ type: 'error', message: t('marketplace:listings.updateError') }),
            },
          )
        }}
      >
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {statusLabel('harvest', status)}
          </option>
        ))}
      </Select>
    </Card>
  )
}

export function MyListingsPage() {
  const { t } = useTranslation(['marketplace', 'common'])
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAuthStore((state) => state.user)
  const addToast = useUiStore((state) => state.addToast)

  const { data: harvests, isLoading } = useHarvests()
  const createHarvest = useCreateHarvest()

  const prefillCropId = searchParams.get('cropId')
  const prefillCropType = searchParams.get('cropType') ?? undefined
  const [isModalOpen, setModalOpen] = useState(() => Boolean(prefillCropId))

  function closeModal() {
    setModalOpen(false)
    if (prefillCropId) {
      searchParams.delete('cropId')
      searchParams.delete('cropType')
      setSearchParams(searchParams, { replace: true })
    }
  }

  const myListings = harvests?.filter(
    (harvest) => user?.district && harvest.district === user.district,
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-text-primary">
          {t('marketplace:listings.title')}
        </h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} weight="bold" />
          {t('marketplace:listings.newListing')}
        </Button>
      </div>

      <p className="flex items-center gap-2 rounded-xl bg-brand-harvest/10 px-3 py-2 text-sm text-text-secondary">
        <Warning size={16} weight="duotone" className="shrink-0 text-brand-harvest" />
        {t('marketplace:listings.districtNotice', {
          district: user?.district ?? t('marketplace:listings.unknownDistrict'),
        })}
      </p>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-48" />
          ))}
        </div>
      )}

      {!isLoading && myListings && myListings.length === 0 && (
        <p className="text-sm text-text-secondary">{t('marketplace:listings.empty')}</p>
      )}

      {!isLoading && myListings && myListings.length > 0 && (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myListings.map((harvest) => (
            <StaggerList.Item key={harvest.harvestId}>
              <MyListingCard harvest={harvest} />
            </StaggerList.Item>
          ))}
        </StaggerList>
      )}

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={t('marketplace:listings.newListing')}
      >
        <HarvestListingForm
          prefill={{
            cropId: prefillCropId ? Number(prefillCropId) : undefined,
            cropType: prefillCropType,
          }}
          isSubmitting={createHarvest.isPending}
          onSubmit={(values) =>
            createHarvest.mutate(values, {
              onSuccess: () => {
                addToast({ type: 'success', message: t('marketplace:listings.published') })
                closeModal()
              },
              onError: () =>
                addToast({ type: 'error', message: t('marketplace:listings.publishError') }),
            })
          }
        />
      </Modal>
    </div>
  )
}
