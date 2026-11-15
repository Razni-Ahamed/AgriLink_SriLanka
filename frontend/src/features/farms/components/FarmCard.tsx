import { MapPin } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { farmPhoto } from '@/lib/scenes'
import { formatQuantity } from '@/lib/utils'
import type { FarmDto } from '@/types/dto/farms'

export function FarmCard({ farm }: { farm: FarmDto }) {
  const { t } = useTranslation()
  const photo = farmPhoto(farm.farmId)

  return (
    <Link
      to={`/farms/${farm.farmId}`}
      className="group block rounded-[26px] outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/60"
    >
      <article className="overflow-hidden rounded-[26px] border border-text-primary/[0.08] bg-bg-surface p-1.5 shadow-sm transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1.2,0.36,1)] group-hover:-translate-y-1 group-hover:shadow-lg">
        <div className="h-32 overflow-hidden rounded-[20px]">
          <img
            src={photo}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        </div>
        <div className="flex items-end justify-between gap-3 px-3 pt-3 pb-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl font-bold text-text-primary">
              {farm.name}
            </h3>
            <p className="flex items-center gap-1 text-sm text-text-secondary">
              <MapPin size={14} aria-hidden="true" />
              {farm.district}
            </p>
          </div>
          <p className="shrink-0 rounded-full bg-brand-forest/10 px-3 py-1 text-sm font-semibold tabular-nums text-brand-forest">
            {t('units.acres', { value: formatQuantity(farm.area) })}
          </p>
        </div>
      </article>
    </Link>
  )
}
