import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatQuantity } from '@/lib/utils'
import { FieldForm } from '../components/FieldForm'
import { FieldList } from '../components/FieldList'
import { FarmForm } from '../components/FarmForm'
import { useCreateField, useDeleteFarm, useFarm, useFields, useUpdateFarm } from '../hooks/useFarms'

export function FarmDetailPage() {
  const { t } = useTranslation(['farms', 'common'])
  const { farmId } = useParams<{ farmId: string }>()
  const id = Number(farmId)
  const navigate = useNavigate()

  const { data: farm, isLoading } = useFarm(id)
  const { data: fields } = useFields(id)
  const updateFarm = useUpdateFarm(id)
  const deleteFarm = useDeleteFarm()
  const createField = useCreateField(id)

  const [isEditOpen, setEditOpen] = useState(false)
  const [isFieldModalOpen, setFieldModalOpen] = useState(false)

  if (isLoading) {
    return <Skeleton className="h-40" />
  }

  if (!farm) {
    return <p className="text-sm text-text-secondary">{t('farms:detail.notFound')}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/farms"
        className="flex w-fit items-center gap-1 text-sm text-text-secondary hover:text-brand-forest"
      >
        <ArrowLeft size={14} />
        {t('farms:detail.back')}
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl text-text-primary">{farm.name}</h1>
          <p className="text-sm text-text-secondary">{farm.district}</p>
          <p className="font-mono text-sm text-brand-forest">
            {t('common:units.acres', { value: formatQuantity(farm.area) })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setEditOpen(true)}>
            <PencilSimple size={16} />
            {t('common:actions.edit')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm(t('farms:detail.deleteConfirm'))) {
                deleteFarm.mutate(farm.farmId, { onSuccess: () => navigate('/farms') })
              }
            }}
          >
            <Trash size={16} />
            {t('common:actions.delete')}
          </Button>
        </div>
      </div>

      {deleteFarm.isError && (
        <p className="text-sm text-state-danger">{t('farms:detail.deleteError')}</p>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-text-primary">{t('farms:detail.fields')}</h2>
        <Button onClick={() => setFieldModalOpen(true)}>
          <Plus size={16} weight="bold" />
          {t('farms:detail.addField')}
        </Button>
      </div>

      <FieldList farmId={farm.farmId} fields={fields ?? []} />

      <Modal
        open={isEditOpen}
        onClose={() => setEditOpen(false)}
        title={t('farms:detail.editFarm')}
      >
        <FarmForm
          defaultValues={farm}
          submitLabel={t('farms:detail.saveChanges')}
          isSubmitting={updateFarm.isPending}
          onSubmit={(values) => updateFarm.mutate(values, { onSuccess: () => setEditOpen(false) })}
        />
      </Modal>

      <Modal
        open={isFieldModalOpen}
        onClose={() => setFieldModalOpen(false)}
        title={t('farms:detail.addField')}
      >
        <FieldForm
          submitLabel={t('farms:detail.addField')}
          isSubmitting={createField.isPending}
          onSubmit={(values) =>
            createField.mutate(values, { onSuccess: () => setFieldModalOpen(false) })
          }
        />
      </Modal>
    </div>
  )
}
