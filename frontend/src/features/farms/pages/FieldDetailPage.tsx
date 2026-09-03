import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Leaf, Plus } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { CardHover } from '@/components/ui/motion/CardHover'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { formatQuantity } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { CropForm } from '../components/CropForm'
import { useField } from '../hooks/useFarms'
import { useFieldCrops, usePlantCrop } from '../hooks/useCrops'

export function FieldDetailPage() {
  const { t } = useTranslation(['farms', 'common'])
  const statusLabel = useStatusLabel()
  const { farmId, fieldId } = useParams<{ farmId: string; fieldId: string }>()
  const farmIdNum = Number(farmId)
  const fieldIdNum = Number(fieldId)

  const { data: field, isLoading } = useField(farmIdNum, fieldIdNum)
  const { data: crops } = useFieldCrops(fieldIdNum)
  const plantCrop = usePlantCrop(fieldIdNum)

  const [isModalOpen, setModalOpen] = useState(false)

  if (isLoading) {
    return <Skeleton className="h-40" />
  }

  if (!field) {
    return <p className="text-sm text-text-secondary">{t('farms:field.notFound')}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={`/farms/${farmIdNum}`}
        className="flex w-fit items-center gap-1 text-sm text-text-secondary hover:text-brand-forest"
      >
        <ArrowLeft size={14} />
        {t('farms:field.back')}
      </Link>

      <div>
        <h1 className="font-display text-2xl text-text-primary">{field.name}</h1>
        <p className="font-mono text-sm text-brand-forest">
          {t('common:units.acres', { value: formatQuantity(field.area) })}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-text-primary">{t('farms:field.crops')}</h2>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} weight="bold" />
          {t('farms:field.plantCrop')}
        </Button>
      </div>

      {crops.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('farms:field.empty')}</p>
      ) : (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {crops.map((crop) => (
            <StaggerList.Item key={crop.cropId}>
              <CardHover>
                <Link to={`/farms/${farmIdNum}/fields/${fieldIdNum}/crops/${crop.cropId}`}>
                  <Card className="flex flex-col gap-3">
                    <IconBadge tone="forest">
                      <Leaf size={20} weight="duotone" />
                    </IconBadge>
                    <h3 className="font-display text-lg text-text-primary">{crop.cropType}</h3>
                    <p className="text-sm text-text-secondary">
                      {crop.variety || t('farms:crop.noVariety')}
                    </p>
                    <p className="font-mono text-xs text-brand-forest">
                      {statusLabel('crop', crop.status)}
                    </p>
                  </Card>
                </Link>
              </CardHover>
            </StaggerList.Item>
          ))}
        </StaggerList>
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setModalOpen(false)}
        title={t('farms:field.plantCrop')}
      >
        <CropForm
          submitLabel={t('farms:field.plantCropSubmit')}
          isSubmitting={plantCrop.isPending}
          onSubmit={(values) => plantCrop.mutate(values, { onSuccess: () => setModalOpen(false) })}
        />
      </Modal>
    </div>
  )
}
