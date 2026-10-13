import { useTranslation } from 'react-i18next'
import { Scales } from '@phosphor-icons/react'
import { IconBadge } from '@/components/ui/IconBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCropLabel } from '@/lib/useCropLabel'
import { formatQuantity } from '@/lib/utils'
import type { PriceStats } from '@/types/dto/harvests'
import { usePriceGuide } from '../hooks/useHarvests'

interface PriceGuideHintProps {
  cropType: string
  district?: string
  /** Fills the price field with the given average. */
  onUsePrice: (price: number) => void
}

/** Recent agreed prices for the crop being listed, in the farm's district and nationwide. A guide
 *  only: it never blocks publishing, and a failed lookup simply shows nothing. */
export function PriceGuideHint({ cropType, district, onUsePrice }: PriceGuideHintProps) {
  const { t } = useTranslation(['marketplace', 'common'])
  const cropLabel = useCropLabel()
  const { data: guide, isLoading, isError } = usePriceGuide(cropType, district)

  if (isLoading) {
    return <Skeleton className="h-20" />
  }
  if (isError || !guide) {
    return null
  }

  const crop = cropLabel(cropType)
  const rupees = (value: number) => t('common:units.rupeesPerUnit', { value: formatQuantity(value) })

  return (
    <section
      aria-label={t('marketplace:priceGuide.title', { crop })}
      className="flex gap-3 rounded-2xl border border-brand-harvest/20 bg-brand-harvest/5 p-3 text-sm"
    >
      <IconBadge tone="harvest" className="shrink-0">
        <Scales size={20} weight="duotone" />
      </IconBadge>
      <div className="flex min-w-0 flex-col gap-2">
        <div>
          <p className="font-medium text-text-primary">{t('marketplace:priceGuide.title', { crop })}</p>
          <p className="text-xs text-text-secondary">
            {t('marketplace:priceGuide.subtitle', { days: guide.windowDays })}
          </p>
        </div>

        {!guide.inDistrict && !guide.nationwide ? (
          <p className="text-text-secondary">
            {t('marketplace:priceGuide.notEnough', { crop, min: guide.minimumSales, days: guide.windowDays })}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {guide.district && (
              <PriceRow
                label={t('marketplace:priceGuide.inDistrict', { district: guide.district })}
                stats={guide.inDistrict}
                empty={t('marketplace:priceGuide.districtNotEnough', { district: guide.district })}
                rupees={rupees}
                onUsePrice={onUsePrice}
              />
            )}
            <PriceRow
              label={t('marketplace:priceGuide.nationwide')}
              stats={guide.nationwide}
              empty={t('marketplace:priceGuide.nationwideNotEnough')}
              rupees={rupees}
              onUsePrice={onUsePrice}
            />
          </ul>
        )}

        <p className="text-xs text-text-secondary">{t('marketplace:priceGuide.disclaimer')}</p>
      </div>
    </section>
  )
}

function PriceRow({
  label,
  stats,
  empty,
  rupees,
  onUsePrice,
}: {
  label: string
  stats: PriceStats | null
  empty: string
  rupees: (value: number) => string
  onUsePrice: (price: number) => void
}) {
  const { t } = useTranslation('marketplace')

  if (!stats) {
    return <li className="text-text-secondary">{empty}</li>
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-text-primary">
          <span className="font-medium">{label}:</span>{' '}
          {t('priceGuide.average', { price: rupees(stats.averagePricePerUnit) })}
        </p>
        <p className="text-xs text-text-secondary">
          {t('priceGuide.range', { min: rupees(stats.minPricePerUnit), max: rupees(stats.maxPricePerUnit) })}
          {' · '}
          {t('priceGuide.sales', { count: stats.sales })}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onUsePrice(stats.averagePricePerUnit)}
        className="rounded-full border border-brand-forest/30 px-3 py-1 text-xs font-medium text-brand-forest hover:bg-brand-forest/10"
      >
        {t('priceGuide.useAverage')}
      </button>
    </li>
  )
}
