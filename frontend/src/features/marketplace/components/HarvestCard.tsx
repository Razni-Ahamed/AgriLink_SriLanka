import { useDistrictLabel } from '@/lib/useDistrictLabel'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { rememberPhoto } from '@/components/canopy/sharedPhoto'
import { cropPhoto } from '@/lib/cropPhotos'
import { useCropLabel } from '@/lib/useCropLabel'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { useUnits } from '@/lib/units'
import { cn, formatDate } from '@/lib/utils'
import type { HarvestListingResponse } from '@/types/dto/harvests'
import { harvestPhotoKey } from '../lib/harvestPhotoKey'

const statusTone = {
  Active: 'bg-[rgb(181_205_160/0.9)] text-[#0b201a]',
  Sold: 'bg-[rgb(10_30_24/0.7)] text-white',
  Cancelled: 'bg-[rgb(178_65_43/0.85)] text-white',
} as const

/**
 * One marketplace listing. A photo of the crop leads, then the crop's name and the price per unit
 * as the largest text; where and when come last, in small print. Hovering lifts the card and
 * slowly zooms the photo; opening it grows the photo into the listing page.
 */
export function HarvestCard({ harvest }: { harvest: HarvestListingResponse }) {
  const { t } = useTranslation()
  const districtLabel = useDistrictLabel()
  const statusLabel = useStatusLabel()
  const cropLabel = useCropLabel()
  const units = useUnits()
  const photoRef = useRef<HTMLDivElement>(null)

  return (
    <Link
      to={`/marketplace/${harvest.harvestId}`}
      onClick={() => rememberPhoto(harvestPhotoKey(harvest.harvestId), photoRef.current)}
      className="group block h-full rounded-[26px] outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/60"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-[26px] border border-text-primary/[0.08] bg-bg-surface p-1.5 shadow-sm transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1.2,0.36,1)] group-hover:-translate-y-1 group-hover:shadow-lg">
        <div
          ref={photoRef}
          className="relative h-44 overflow-hidden rounded-[20px] bg-brand-forest/10"
        >
          <img
            src={cropPhoto(harvest.cropType)}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent"
          />
          <span
            className={cn(
              'absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-md',
              statusTone[harvest.status],
            )}
          >
            {statusLabel('harvest', harvest.status)}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 px-3 pt-3 pb-2.5">
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl leading-tight font-bold text-text-primary">
              {cropLabel(harvest.cropType)}
            </h3>
            {harvest.variety && (
              <p className="truncate text-sm text-text-secondary">{harvest.variety}</p>
            )}
          </div>

          <div>
            <p className="font-display text-2xl font-bold tabular-nums text-brand-forest">
              {units.price(harvest.pricePerUnit, harvest.unit)}
            </p>
            <p className="text-sm tabular-nums text-text-primary">
              {t('units.availableQuantity', {
                quantity: units.quantity(harvest.availableQuantity, harvest.unit),
              })}
            </p>
          </div>

          <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-text-primary/[0.07] pt-2.5 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <MapPin size={13} aria-hidden="true" />
              {districtLabel(harvest.district)}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Calendar size={13} aria-hidden="true" />
              {formatDate(harvest.harvestDate)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
