import { Link } from 'react-router-dom'
import { Calendar, MapPin } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { CropIcon } from '@/components/ui/CropIcon'
import { Badge } from '@/components/ui/Badge'
import { useCropLabel } from '@/lib/useCropLabel'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { useUnits } from '@/lib/units'
import { formatDate } from '@/lib/utils'
import type { HarvestListingResponse } from '@/types/dto/harvests'

const statusVariant = {
  Active: 'success',
  Sold: 'neutral',
  Cancelled: 'danger',
} as const

/**
 * One marketplace listing. Buyers compare crops and prices first, so the crop artwork leads and
 * the price per unit is the largest text; where and when come after, in small print.
 */
export function HarvestCard({ harvest }: { harvest: HarvestListingResponse }) {
  const { t } = useTranslation()
  const statusLabel = useStatusLabel()
  const cropLabel = useCropLabel()
  const units = useUnits()

  return (
    <Link to={`/marketplace/${harvest.harvestId}`} className="block h-full">
      <Card interactive className="flex h-full flex-col gap-3">
        <div className="relative flex h-24 items-center justify-center rounded-xl bg-brand-forest/[0.06] text-brand-forest">
          <CropIcon cropType={harvest.cropType} size={56} />
          <Badge variant={statusVariant[harvest.status]} className="absolute top-2 right-2">
            {statusLabel('harvest', harvest.status)}
          </Badge>
        </div>

        <div className="min-w-0">
          <h3 className="truncate font-display text-lg text-text-primary">
            {cropLabel(harvest.cropType)}
          </h3>
          {harvest.variety && (
            <p className="truncate text-sm text-text-secondary">{harvest.variety}</p>
          )}
        </div>

        <div>
          <p className="text-2xl font-semibold tabular-nums text-brand-forest">
            {units.price(harvest.pricePerUnit, harvest.unit)}
          </p>
          <p className="text-sm tabular-nums text-text-primary">
            {t('units.availableQuantity', {
              quantity: units.quantity(harvest.availableQuantity, harvest.unit),
            })}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <MapPin size={13} aria-hidden="true" />
            {harvest.district}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <Calendar size={13} aria-hidden="true" />
            {formatDate(harvest.harvestDate)}
          </span>
        </div>
      </Card>
    </Link>
  )
}
