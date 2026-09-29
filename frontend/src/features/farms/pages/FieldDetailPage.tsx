import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CropIcon } from '@/components/ui/CropIcon'
import { IconBadge } from '@/components/ui/IconBadge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { CardHover } from '@/components/ui/motion/CardHover'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { mutationErrorMessage, parseApiError } from '@/lib/apiErrors'
import { formatQuantity } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { CropForm } from '../components/CropForm'
import { FieldForm } from '../components/FieldForm'
import { useDeleteField, useField, useUpdateField } from '../hooks/useFarms'
import { useFieldCrops, usePlantCrop } from '../hooks/useCrops'

export function FieldDetailPage() {
  const { t } = useTranslation(['farms', 'common'])
  const statusLabel = useStatusLabel()
  const { farmId, fieldId } = useParams<{ farmId: string; fieldId: string }>()
  const farmIdNum = Number(farmId)
  const fieldIdNum = Number(fieldId)

  const { data: field, isLoading } = useField(farmIdNum, fieldIdNum)
  const { data: crops, isLoading: isLoadingCrops } = useFieldCrops(fieldIdNum)
  const plantCrop = usePlantCrop(fieldIdNum)
  const updateField = useUpdateField(farmIdNum, fieldIdNum)
  const deleteField = useDeleteField(farmIdNum)
  const navigate = useNavigate()

  const [isModalOpen, setModalOpen] = useState(false)
  const [isEditOpen, setEditOpen] = useState(false)

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

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-text-primary">{field.name}</h1>
          <p className="font-mono text-sm text-brand-forest">
            {t('common:units.acres', { value: formatQuantity(field.area) })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setEditOpen(true)}>
            <PencilSimple size={16} />
            {t('common:actions.edit')}
          </Button>
          <Button
            variant="danger"
            disabled={deleteField.isPending}
            onClick={() => {
              if (confirm(t('farms:field.deleteConfirm'))) {
                deleteField.mutate(field.fieldId, {
                  onSuccess: () => navigate(`/farms/${farmIdNum}`),
                })
              }
            }}
          >
            <Trash size={16} />
            {t('common:actions.delete')}
          </Button>
        </div>
      </div>

      {/* The API says why a delete was refused (the field still has crops). */}
      {deleteField.isError && (
        <p className="text-sm text-state-danger">
          {
            parseApiError(deleteField.error, t, { genericErrorKey: 'farms:form.deleteError' })
              .generalErrors[0]
          }
        </p>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-text-primary">{t('farms:field.crops')}</h2>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} weight="bold" />
          {t('farms:field.plantCrop')}
        </Button>
      </div>

      {isLoadingCrops && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      )}

      {!isLoadingCrops && crops && crops.length === 0 && (
        <p className="text-sm text-text-secondary">{t('farms:field.empty')}</p>
      )}

      {!isLoadingCrops && crops && crops.length > 0 && (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {crops.map((crop) => {
            return (
              <StaggerList.Item key={crop.cropId}>
                <CardHover>
                  <Link to={`/farms/${farmIdNum}/fields/${fieldIdNum}/crops/${crop.cropId}`}>
                    <Card className="flex flex-col gap-3">
                      <IconBadge tone="forest">
                        <CropIcon cropType={crop.cropType} size={20} />
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
            )
          })}
        </StaggerList>
      )}

      <Modal
        open={isEditOpen}
        onClose={() => {
          setEditOpen(false)
          updateField.reset()
        }}
        title={t('farms:field.editField')}
      >
        <FieldForm
          defaultValues={{ name: field.name, area: field.area }}
          submitLabel={t('farms:detail.saveChanges')}
          isSubmitting={updateField.isPending}
          error={mutationErrorMessage(updateField, t, 'farms:form.saveError')}
          onSubmit={(values) => updateField.mutate(values, { onSuccess: () => setEditOpen(false) })}
        />
      </Modal>

      <Modal
        open={isModalOpen}
        onClose={() => {
          setModalOpen(false)
          plantCrop.reset()
        }}
        title={t('farms:field.plantCrop')}
      >
        <CropForm
          submitLabel={t('farms:field.plantCropSubmit')}
          isSubmitting={plantCrop.isPending}
          error={mutationErrorMessage(plantCrop, t, 'farms:form.saveError')}
          onSubmit={(values) => plantCrop.mutate(values, { onSuccess: () => setModalOpen(false) })}
        />
      </Modal>
    </div>
  )
}
