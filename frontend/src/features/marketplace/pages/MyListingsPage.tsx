import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Basket, PencilSimple, Plus } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CropIcon } from '@/components/ui/CropIcon'
import { IconBadge } from '@/components/ui/IconBadge'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { useUiStore } from '@/lib/useUiStore'
import { formatDate, formatQuantity } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { EditHarvestForm } from '../components/EditHarvestForm'
import { HarvestListingForm } from '../components/HarvestListingForm'
import { useCreateHarvest, useMyHarvests, useUpdateHarvest } from '../hooks/useHarvests'
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
  const [isEditOpen, setEditOpen] = useState(false)

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <IconBadge tone="forest" className="shrink-0">
            <CropIcon cropType={harvest.cropType} size={18} />
          </IconBadge>
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg text-text-primary">{harvest.cropType}</h3>
            <p className="truncate text-sm text-text-secondary">{harvest.variety}</p>
          </div>
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

      {/* Status stays a one-click switch here (marking a listing Sold is the common case);
          the full editor behind "Edit Listing" covers price, location and harvest date —
          all of which PUT /api/harvests/{id} accepts from the listing's own farmer. */}
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

      <Button variant="secondary" className="w-fit" onClick={() => setEditOpen(true)}>
        <PencilSimple size={16} weight="bold" />
        {t('marketplace:editForm.editListing')}
      </Button>

      <Modal
        open={isEditOpen}
        onClose={() => setEditOpen(false)}
        title={t('marketplace:editForm.editListing')}
      >
        <EditHarvestForm
          harvest={harvest}
          isSubmitting={updateHarvest.isPending}
          onSubmit={(values) =>
            updateHarvest.mutate(values, {
              onSuccess: () => {
                addToast({ type: 'success', message: t('marketplace:editForm.saved') })
                setEditOpen(false)
              },
              onError: () =>
                addToast({ type: 'error', message: t('marketplace:editForm.saveError') }),
            })
          }
        />
      </Modal>
    </Card>
  )
}

export function MyListingsPage() {
  const { t } = useTranslation(['marketplace', 'common'])
  const [searchParams, setSearchParams] = useSearchParams()
  const addToast = useUiStore((state) => state.addToast)

  const { data: myListings, isLoading } = useMyHarvests()
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

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-48" />
          ))}
        </div>
      )}

      {!isLoading && myListings && myListings.length === 0 && (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <IconBadge tone="forest">
            <Basket size={20} weight="duotone" />
          </IconBadge>
          <p className="text-sm text-text-primary">{t('marketplace:listings.empty')}</p>
          <p className="max-w-sm text-sm text-text-secondary">
            {t('marketplace:listings.emptyHint')}
          </p>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            <Plus size={16} weight="bold" />
            {t('marketplace:listings.newListing')}
          </Button>
        </Card>
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

      <Modal open={isModalOpen} onClose={closeModal} title={t('marketplace:listings.newListing')}>
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
