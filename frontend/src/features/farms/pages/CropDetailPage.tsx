import { BannerGlass, PhotoBanner } from '@/components/canopy/PhotoBanner'
import { SeasonVine } from '@/components/canopy/SeasonVine'
import { cropPhoto } from '@/lib/cropPhotos'
import { seasonProgress } from '@/lib/season'
import { useCropLabel } from '@/lib/useCropLabel'
import { useNavigate, useParams } from 'react-router-dom'
import { Basket, Trash, Warning } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Select } from '@/components/ui/Select'
import { parseApiError } from '@/lib/apiErrors'
import { formatDate, formatQuantity } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import type { CropStatus } from '@/types/dto/crops'
import { useCrop, useDeleteCrop, useUpdateCropStatus } from '../hooks/useCrops'

const statusOptions: CropStatus[] = ['Seeded', 'Growing', 'Harvested']

export function CropDetailPage() {
  const { t } = useTranslation(['farms', 'common'])
  const statusLabel = useStatusLabel()
  const cropLabel = useCropLabel()
  const { farmId, fieldId, cropId } = useParams<{
    farmId: string
    fieldId: string
    cropId: string
  }>()
  const cropIdNum = Number(cropId)

  const navigate = useNavigate()
  const { data: crop, isLoading } = useCrop(cropIdNum)
  const updateStatus = useUpdateCropStatus(cropIdNum)
  const deleteCrop = useDeleteCrop(Number(fieldId))

  if (isLoading) {
    return <Skeleton className="h-40" />
  }

  if (!crop) {
    return <p className="text-sm text-text-secondary">{t('farms:crop.notFound')}</p>
  }

  const season = seasonProgress(crop.plantingDate, crop.expectedHarvestDate)

  return (
    <div className="flex flex-col gap-6">
      <PhotoBanner
        photo={cropPhoto(crop.cropType)}
        back={{ to: `/farms/${farmId}/fields/${fieldId}`, label: t('farms:crop.back') }}
        title={cropLabel(crop.cropType)}
        subtitle={crop.variety || t('farms:crop.noVariety')}
      >
        <BannerGlass className="px-4 pt-2 pb-4 sm:px-5">
          <SeasonVine
            fraction={season.fraction}
            label={t('farms:today.vineLabel', {
              crop: cropLabel(crop.cropType),
              day: season.day,
              total: season.total,
            })}
            className="text-white"
          />
          <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-white/65">{t('farms:crop.plantingDate')}</dt>
              <dd className="font-semibold tabular-nums">{formatDate(crop.plantingDate)}</dd>
            </div>
            <div>
              <dt className="text-white/65">{t('farms:crop.expectedHarvest')}</dt>
              <dd className="font-semibold tabular-nums">{formatDate(crop.expectedHarvestDate)}</dd>
            </div>
            <div>
              <dt className="text-white/65">{t('farms:crop.expectedQuantity')}</dt>
              <dd className="font-semibold tabular-nums">
                {t('common:units.kg', { value: formatQuantity(crop.expectedQuantity) })}
              </dd>
            </div>
            <div>
              <dt className="text-white/65">
                {t('farms:today.day', { day: season.day, total: season.total })}
              </dt>
              <dd className="font-semibold">
                {season.daysLeft > 0
                  ? t('farms:today.harvestIn', { count: season.daysLeft })
                  : t('farms:today.harvestDue')}
              </dd>
            </div>
          </dl>
        </BannerGlass>
      </PhotoBanner>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-primary">{t('common:fields.status')}</span>
        <Select
          value={crop.status}
          onChange={(event) => updateStatus.mutate({ status: event.target.value as CropStatus })}
          disabled={updateStatus.isPending}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {statusLabel('crop', status)}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() =>
            navigate(
              `/issues/new?cropId=${crop.cropId}&cropType=${encodeURIComponent(crop.cropType)}`,
            )
          }
        >
          <Warning size={16} weight="duotone" />
          {t('farms:crop.reportIssue')}
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            navigate(
              `/marketplace/mine?cropId=${crop.cropId}&cropType=${encodeURIComponent(crop.cropType)}`,
            )
          }
        >
          <Basket size={16} weight="duotone" />
          {t('farms:crop.listForSale')}
        </Button>
        <Button
          variant="danger"
          disabled={deleteCrop.isPending}
          onClick={() => {
            if (confirm(t('farms:crop.deleteConfirm'))) {
              deleteCrop.mutate(crop.cropId, {
                onSuccess: () => navigate(`/farms/${farmId}/fields/${fieldId}`),
              })
            }
          }}
        >
          <Trash size={16} />
          {t('common:actions.delete')}
        </Button>
      </div>

      {/* The API says why a delete was refused (the crop has issues or listings). */}
      {deleteCrop.isError && (
        <p className="text-sm text-state-danger">
          {
            parseApiError(deleteCrop.error, t, { genericErrorKey: 'farms:form.deleteError' })
              .generalErrors[0]
          }
        </p>
      )}
    </div>
  )
}
