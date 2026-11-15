import { useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, Calendar, MapPin, Package, Scales } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { useGrowFromRemembered } from '@/components/canopy/sharedPhoto'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/auth/authStore'
import { cropPhoto } from '@/lib/cropPhotos'
import { spring } from '@/lib/motion'
import { useCropLabel } from '@/lib/useCropLabel'
import { useUiStore } from '@/lib/useUiStore'
import { cn, formatDate } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { useUnits } from '@/lib/units'
import { EditHarvestForm } from '../components/EditHarvestForm'
import { RequestPanel } from '../components/RequestPanel'
import { useHarvest, useUpdateHarvest } from '../hooks/useHarvests'
import { useCreatePurchaseRequest } from '../hooks/usePurchaseRequests'
import { harvestPhotoKey } from '../lib/harvestPhotoKey'

const statusTone = {
  Active: 'bg-[rgb(181_205_160/0.92)] text-[#0b201a]',
  Sold: 'bg-[rgb(10_30_24/0.75)] text-white',
  Cancelled: 'bg-[rgb(178_65_43/0.88)] text-white',
} as const

/**
 * A single listing. The crop's photo fills the top (growing out of the card that was tapped), a
 * glass sheet with the facts rises over its bottom edge, and a buyer can ask to buy right there,
 * without a pop-up.
 */
export function HarvestDetailPage() {
  const { t } = useTranslation(['marketplace', 'common'])
  const units = useUnits()
  const statusLabel = useStatusLabel()
  const cropLabel = useCropLabel()
  const { harvestId } = useParams<{ harvestId: string }>()
  const id = Number(harvestId)
  const role = useAuthStore((state) => state.role)
  const farmerProfileId = useAuthStore((state) => state.user?.farmerProfileId)
  const addToast = useUiStore((state) => state.addToast)

  const { data: harvest, isLoading } = useHarvest(id)
  const createRequest = useCreatePurchaseRequest()
  const updateHarvest = useUpdateHarvest(id)

  const [requestSent, setRequestSent] = useState(false)
  const [isEditOpen, setEditOpen] = useState(false)
  const photoRef = useRef<HTMLDivElement>(null)
  useGrowFromRemembered(harvestPhotoKey(id), photoRef)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[340px] rounded-[28px]" />
        <Skeleton className="h-48 rounded-[28px]" />
      </div>
    )
  }

  if (!harvest) {
    return <p className="text-sm text-text-secondary">{t('marketplace:detail.notFound')}</p>
  }

  const canBuy = role === 'Buyer' && harvest.status === 'Active'
  // PUT /api/harvests/{id} takes an admin moderating any listing *or* the farmer who owns this
  // one — the same self-service edit the backend already allows.
  const canEdit =
    role === 'Admin' || (role === 'Farmer' && farmerProfileId === harvest.farmerProfileId)

  return (
    <div className="flex flex-col">
      <div
        ref={photoRef}
        className="relative h-[300px] overflow-hidden rounded-[28px] bg-brand-ink shadow-lg sm:h-[420px]"
      >
        <img
          src={cropPhoto(harvest.cropType)}
          alt=""
          className="size-full object-cover"
          aria-hidden="true"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgb(4_16_11/0.45)_0%,transparent_30%,transparent_55%,rgb(4_16_11/0.55)_100%)]"
        />
        <Link
          to="/marketplace/browse"
          aria-label={t('marketplace:detail.back')}
          className="banner-glass absolute top-4 left-4 flex size-11 items-center justify-center rounded-full text-white transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-white"
        >
          <ArrowLeft size={20} weight="bold" />
        </Link>
        <span
          className={cn(
            'absolute top-5 right-5 rounded-full px-3 py-1.5 text-sm font-semibold shadow-sm backdrop-blur-md',
            statusTone[harvest.status],
          )}
        >
          {statusLabel('harvest', harvest.status)}
        </span>
      </div>

      <div
        className={cn(
          'relative z-10 -mt-16 grid gap-5 px-2 sm:-mt-24 sm:px-6 lg:items-start',
          canBuy ? 'lg:grid-cols-[minmax(0,1fr)_400px]' : 'max-w-4xl',
        )}
      >
        <motion.section
          className="glass rounded-[28px] p-5 sm:p-7"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...spring.reveal, delay: 0.08 }}
        >
          <h1 className="font-display text-4xl leading-[1.05] font-bold text-text-primary sm:text-5xl">
            {cropLabel(harvest.cropType)}
          </h1>
          <p className="mt-1 text-text-secondary">
            {harvest.variety || t('marketplace:detail.noVariety')}
            {harvest.location ? ` · ${harvest.location}` : ''}
          </p>

          <p className="mt-5 font-display text-3xl font-bold tabular-nums text-brand-forest">
            {units.price(harvest.pricePerUnit, harvest.unit)}
          </p>

          <dl className="mt-5 grid grid-cols-2 border-y border-text-primary/10 py-4 sm:grid-cols-4">
            <Spec icon={<MapPin size={16} />} label={t('marketplace:detail.district')}>
              {harvest.district}
            </Spec>
            <Spec icon={<Calendar size={16} />} label={t('marketplace:detail.harvestDate')}>
              {formatDate(harvest.harvestDate)}
            </Spec>
            <Spec icon={<Package size={16} />} label={t('marketplace:detail.availableQuantity')}>
              {units.quantity(harvest.availableQuantity, harvest.unit)}
            </Spec>
            <Spec icon={<Scales size={16} />} label={t('marketplace:detail.soldBy')}>
              {units.per(harvest.unit)}
            </Spec>
          </dl>

          {canEdit && (
            <Button className="mt-5" variant="secondary" onClick={() => setEditOpen(true)}>
              {t('marketplace:editForm.editListing')}
            </Button>
          )}
        </motion.section>

        {canBuy && (
          <motion.aside
            className="glass rounded-[28px] p-5 sm:p-6 lg:sticky lg:top-24"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...spring.reveal, delay: 0.16 }}
            aria-label={t('marketplace:detail.request')}
          >
            <h2 className="mb-4 font-display text-2xl font-bold text-text-primary">
              {t('marketplace:detail.request')}
            </h2>
            <RequestPanel
              pricePerUnit={harvest.pricePerUnit}
              availableQuantity={harvest.availableQuantity}
              unit={harvest.unit}
              isSending={createRequest.isPending}
              isSent={requestSent}
              onSend={(values) =>
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
          </motion.aside>
        )}
      </div>

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
    </div>
  )
}

function Spec({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-1 py-2 sm:border-l sm:border-text-primary/10 sm:px-4 sm:first:border-l-0 sm:first:pl-0">
      <dt className="flex items-center gap-1.5 text-xs text-text-secondary">
        <span aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className="font-semibold tabular-nums text-text-primary">{children}</dd>
    </div>
  )
}
