import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/auth/authStore'
import { useUiStore } from '@/lib/useUiStore'
import { formatDate, formatQuantity } from '@/lib/utils'
import { PurchaseRequestForm } from '../components/PurchaseRequestForm'
import { useHarvest } from '../hooks/useHarvests'
import { useCreatePurchaseRequest } from '../hooks/usePurchaseRequests'

const statusVariant = {
  Active: 'success',
  Sold: 'neutral',
  Cancelled: 'danger',
} as const

export function HarvestDetailPage() {
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
    return <p className="text-sm text-text-secondary">Listing not found.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/marketplace/browse"
        className="flex w-fit items-center gap-1 text-sm text-text-secondary hover:text-brand-forest"
      >
        <ArrowLeft size={14} />
        Back to marketplace
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl text-text-primary">{harvest.cropType}</h1>
          <p className="text-sm text-text-secondary">{harvest.variety || 'No variety noted'}</p>
        </div>
        <Badge variant={statusVariant[harvest.status]}>{harvest.status}</Badge>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="flex items-center gap-1 text-text-secondary">
            <MapPin size={14} />
            District
          </dt>
          <dd className="font-mono text-text-primary">{harvest.district}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-text-secondary">
            <Calendar size={14} />
            Harvest date
          </dt>
          <dd className="font-mono text-text-primary">{formatDate(harvest.harvestDate)}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Location</dt>
          <dd className="font-mono text-text-primary">{harvest.location}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Available quantity</dt>
          <dd className="font-mono tabular-nums text-text-primary">
            {formatQuantity(harvest.availableQuantity)}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">Price per unit</dt>
          <dd className="font-mono tabular-nums text-brand-forest">
            Rs {harvest.pricePerUnit.toLocaleString('en-LK', { maximumFractionDigits: 2 })}
          </dd>
        </div>
      </dl>

      {role === 'Buyer' && harvest.status === 'Active' && (
        <Button className="w-fit" onClick={() => setRequestOpen(true)}>
          Request Purchase
        </Button>
      )}

      <Modal
        open={isRequestOpen}
        onClose={() => {
          setRequestOpen(false)
          setRequestSent(false)
        }}
        title="Request Purchase"
      >
        {requestSent ? (
          <p className="text-sm text-text-primary">
            Your request has been sent — the farmer will respond soon; you'll see it in Orders
            once accepted.
          </p>
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
                    addToast({ type: 'success', message: 'Purchase request sent.' })
                  },
                  onError: () =>
                    addToast({ type: 'error', message: 'Could not send the request. Try again.' }),
                },
              )
            }
          />
        )}
      </Modal>
    </div>
  )
}
