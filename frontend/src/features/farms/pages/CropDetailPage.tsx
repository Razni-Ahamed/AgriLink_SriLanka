import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Warning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Select } from '@/components/ui/Select'
import { formatDate, formatQuantity } from '@/lib/utils'
import type { CropStatus } from '@/types/dto/crops'
import { useCrop, useUpdateCropStatus } from '../hooks/useCrops'

const statusOptions: CropStatus[] = ['Seeded', 'Growing', 'Harvested']

export function CropDetailPage() {
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
    return <p className="text-sm text-text-secondary">Crop not found.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={`/farms/${farmId}/fields/${fieldId}`}
        className="flex w-fit items-center gap-1 text-sm text-text-secondary hover:text-brand-forest"
      >
        <ArrowLeft size={14} />
        Back to field
      </Link>

      <div>
        <h1 className="font-display text-2xl text-text-primary">{crop.cropType}</h1>
        <p className="text-sm text-text-secondary">{crop.variety || 'No variety noted'}</p>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-text-secondary">Planting date</dt>
          <dd className="font-mono text-text-primary">{formatDate(crop.plantingDate)}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Expected harvest</dt>
          <dd className="font-mono text-text-primary">{formatDate(crop.expectedHarvestDate)}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Expected quantity</dt>
          <dd className="font-mono text-text-primary">
            {formatQuantity(crop.expectedQuantity)} kg
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-text-primary">Status</span>
        <Select
          value={crop.status}
          onChange={(event) => updateStatus.mutate({ status: event.target.value as CropStatus })}
          disabled={updateStatus.isPending}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </div>

      <Button
        variant="secondary"
        className="w-fit"
        onClick={() =>
          navigate(
            `/issues/new?cropId=${crop.cropId}&cropType=${encodeURIComponent(crop.cropType)}`,
          )
        }
      >
        <Warning size={16} weight="duotone" />
        Report an Issue
      </Button>
    </div>
  )
}
