import { useState } from 'react'
import { Plus } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { FarmCard } from '../components/FarmCard'
import { FarmForm } from '../components/FarmForm'
import { useCreateFarm, useFarms } from '../hooks/useFarms'

export function FarmsListPage() {
  const { t } = useTranslation('farms')
  const { data: farms, isLoading } = useFarms()
  const createFarm = useCreateFarm()
  const [isModalOpen, setModalOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-text-primary">{t('list.title')}</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} weight="bold" />
          {t('list.newFarm')}
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      )}

      {!isLoading && farms && farms.length === 0 && (
        <p className="text-sm text-text-secondary">{t('list.empty')}</p>
      )}

      {!isLoading && farms && farms.length > 0 && (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {farms.map((farm) => (
            <StaggerList.Item key={farm.farmId}>
              <FarmCard farm={farm} />
            </StaggerList.Item>
          ))}
        </StaggerList>
      )}

      <Modal open={isModalOpen} onClose={() => setModalOpen(false)} title={t('list.newFarm')}>
        <FarmForm
          submitLabel={t('list.createFarm')}
          isSubmitting={createFarm.isPending}
          onSubmit={(values) => createFarm.mutate(values, { onSuccess: () => setModalOpen(false) })}
        />
      </Modal>
    </div>
  )
}
