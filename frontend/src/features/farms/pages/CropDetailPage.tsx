import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Basket, Warning } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Select } from '@/components/ui/Select'
import { formatDate, formatQuantity } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import type { CropStatus } from '@/types/dto/crops'
import { useCrop, useUpdateCropStatus } from '../hooks/useCrops'

const statusOptions: CropStatus[] = ['Seeded', 'Growing', 'Harvested']

export function CropDetailPage() {
  const { t } = useTranslation(['farms', 'common'])
  const statusLabel = useStatusLabel()
  const { farmId, fieldId, cropId } = useParams<{
    farmId: string
    fieldId: string
    cropId: string
  }>()
  const cropIdNum = Number(cropId)

  const navigate = useNavigate()
  const { data: crop, isLoading } = useCrop(cropIdNum)
  const updateStatus = useUpdateCropStatus(cropIdNum)

  if (isLoading) {
    return <Skeleton className="h-40" />
  }

  if (!crop) {
    return <p className="text-sm text-text-secondary">{t('farms:crop.notFound')}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={`/farms/${farmId}/fields/${fieldId}`}
        className="flex w-fit items-center gap-1 text-sm text-text-secondary hover:text-brand-forest"
      >
        <ArrowLeft size={14} />
        {t('farms:crop.back')}
      </Link>

      <div>
        <h1 className="font-display text-2xl text-text-primary">{crop.cropType}</h1>
        <p className="text-sm text-text-secondary">
          {crop.variety || t('farms:crop.noVariety')}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-text-secondary">{t('farms:crop.plantingDate')}</dt>
          <dd className="font-mono text-text-primary">{formatDate(crop.plantingDate)}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">{t('farms:crop.expectedHarvest')}</dt>
          <dd className="font-mono text-text-primary">{formatDate(crop.expectedHarvestDate)}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">{t('farms:crop.expectedQuantity')}</dt>
          <dd className="font-mono text-text-primary">
            {t('common:units.kg', { value: formatQuantity(crop.expectedQuantity) })}
          </dd>
        </div>
      </dl>

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

      <div className="flex gap-2">
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
      </div>
    </div>
  )
}
