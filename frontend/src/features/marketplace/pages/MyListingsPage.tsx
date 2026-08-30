import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Warning } from '@phosphor-icons/react'
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
  const updateHarvest = useUpdateHarvest(harvest.harvestId)
  const addToast = useUiStore((state) => state.addToast)

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-lg text-text-primary">{harvest.cropType}</h3>
          <p className="text-sm text-text-secondary">{harvest.variety}</p>
        </div>
        <Badge variant={statusVariant[harvest.status]}>{harvest.status}</Badge>
      </div>

      <p className="font-mono tabular-nums text-brand-forest">
        Rs {harvest.pricePerUnit.toLocaleString('en-LK', { maximumFractionDigits: 2 })}/unit
      </p>
      <p className="font-mono tabular-nums text-sm text-text-secondary">
        {formatQuantity(harvest.availableQuantity)} of {formatQuantity(harvest.quantity)} available
      </p>
      <p className="text-xs text-text-secondary">Harvested {formatDate(harvest.harvestDate)}</p>

      <Select
        label="Status"
        value={harvest.status}
        disabled={updateHarvest.isPending}
        onChange={(event) => {
          updateHarvest.mutate(
            { status: event.target.value as HarvestStatus },
            {
              onSuccess: () => addToast({ type: 'success', message: 'Listing updated.' }),
              onError: () =>
                addToast({ type: 'error', message: 'Could not update the listing.' }),
            },
          )
        }}
      >
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>
    </Card>
  )
}

export function MyListingsPage() {
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
        <h1 className="font-display text-2xl text-text-primary">My Listings</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} weight="bold" />
          New Listing
        </Button>
      </div>

      <p className="flex items-center gap-2 rounded-xl bg-brand-harvest/10 px-3 py-2 text-sm text-text-secondary">
        <Warning size={16} weight="duotone" className="shrink-0 text-brand-harvest" />
        Approximate — showing active listings in your district ({user?.district ?? 'unknown'}).
        The backend doesn't yet expose your farmer profile ID on listings, so this can't be
        filtered exactly to listings you created; a <code>?mine=true</code> endpoint or exposing{' '}
        <code>farmerProfileId</code> on <code>GET /api/users/me</code> would fix this.
      </p>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-48" />
          ))}
        </div>
      )}

      {!isLoading && myListings && myListings.length === 0 && (
        <p className="text-sm text-text-secondary">No listings found in your district yet.</p>
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

      <Modal open={isModalOpen} onClose={closeModal} title="New Listing">
        <HarvestListingForm
          prefill={{
            cropId: prefillCropId ? Number(prefillCropId) : undefined,
            cropType: prefillCropType,
          }}
          isSubmitting={createHarvest.isPending}
          onSubmit={(values) =>
            createHarvest.mutate(values, {
              onSuccess: () => {
                addToast({ type: 'success', message: 'Listing published.' })
                closeModal()
              },
              onError: () =>
                addToast({ type: 'error', message: 'Could not publish the listing.' }),
            })
          }
        />
      </Modal>
    </div>
  )
}
