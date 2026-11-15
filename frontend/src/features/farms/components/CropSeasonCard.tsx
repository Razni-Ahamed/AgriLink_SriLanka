import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SeasonVine } from '@/components/canopy/SeasonVine'
import { cropPhoto } from '@/lib/cropPhotos'
import { seasonProgress } from '@/lib/season'
import { useCropLabel } from '@/lib/useCropLabel'
import { useStatusLabel } from '@/lib/useStatusLabel'
import type { FarmerCropSummary } from '@/types/dto/crops'

/**
 * A growing crop as its own photo, with the season on a glass panel over the bottom: a vine that
 * grows to today, the day count and how long until harvest. Links to the crop's page.
 */
export function CropSeasonCard({ crop }: { crop: FarmerCropSummary }) {
  const { t } = useTranslation('farms')
  const cropLabel = useCropLabel()
  const statusLabel = useStatusLabel()
  const season = seasonProgress(crop.plantingDate, crop.expectedHarvestDate)
  const name = cropLabel(crop.cropType)

  return (
    <Link
      to={`/farms/${crop.farmId}/fields/${crop.fieldId}/crops/${crop.cropId}`}
      className="group relative isolate flex min-h-[230px] flex-col justify-between overflow-hidden rounded-[28px] bg-brand-ink p-3 text-white shadow-lg outline-none transition-transform duration-300 ease-[cubic-bezier(0.22,1.2,0.36,1)] hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-brand-forest/60"
    >
      <img
        src={cropPhoto(crop.cropType)}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(4_16_11/0.7)_0%,rgb(4_16_11/0)_48%,rgb(4_16_11/0.25)_100%)]"
      />

      <div className="flex items-start justify-between gap-2 px-2 pt-1">
        <div className="min-w-0">
          <h3 className="truncate font-display text-2xl leading-tight font-bold">{name}</h3>
          <p className="truncate text-sm text-white/85">
            {[crop.variety, crop.fieldName].filter(Boolean).join(', ')}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur-md">
          {statusLabel('crop', crop.status)}
        </span>
      </div>

      <div className="banner-glass mt-16 rounded-[20px] px-3.5 pt-1 pb-2.5">
        <SeasonVine
          fraction={season.fraction}
          label={t('today.vineLabel', { crop: name, day: season.day, total: season.total })}
          className="text-white"
        />
        <div className="flex justify-between gap-2 text-xs text-white/80">
          <span>
            <b className="font-semibold text-white">
              {t('today.day', { day: season.day, total: season.total })}
            </b>
          </span>
          <span>
            {season.daysLeft > 0
              ? t('today.harvestIn', { count: season.daysLeft })
              : t('today.harvestDue')}
          </span>
        </div>
      </div>
    </Link>
  )
}
