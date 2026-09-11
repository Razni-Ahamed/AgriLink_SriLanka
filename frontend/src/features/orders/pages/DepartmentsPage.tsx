import { useState } from 'react'
import { Plus } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useUiStore } from '@/lib/useUiStore'
import { DepartmentForm } from '../components/DepartmentForm'
import { DepartmentsTable } from '../components/DepartmentsTable'
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useRenameDepartment,
} from '../hooks/useDepartments'
import type { Department } from '@/types/dto/admin'

export function DepartmentsPage() {
  const { t } = useTranslation(['orders', 'common'])
  const addToast = useUiStore((state) => state.addToast)

  const { data: departments, isLoading, isError } = useDepartments()
  const createDepartment = useCreateDepartment()
  const renameDepartment = useRenameDepartment()
  const deleteDepartment = useDeleteDepartment()

  const [isCreateOpen, setCreateOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Department | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null)

  const isMutating = createDepartment.isPending || renameDepartment.isPending || deleteDepartment.isPending

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-text-primary">{t('orders:departments.title')}</h1>
          <p className="text-sm text-text-secondary">{t('orders:departments.subtitle')}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} weight="bold" />
          {t('orders:departments.newDepartment')}
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-state-danger">{t('orders:departments.loadError')}</p>}

      {!isLoading && !isError && departments && departments.length === 0 && (
        <p className="text-sm text-text-secondary">{t('orders:departments.empty')}</p>
      )}

      {!isLoading && !isError && departments && departments.length > 0 && (
        <DepartmentsTable
          departments={departments}
          isMutating={isMutating}
          onRename={setRenameTarget}
          onDelete={setDeleteTarget}
        />
      )}

      <Modal open={isCreateOpen} onClose={() => setCreateOpen(false)} title={t('orders:departments.newDepartment')}>
        <DepartmentForm
          submitLabel={t('orders:departments.create')}
          isSubmitting={createDepartment.isPending}
          onSubmit={(values) =>
            createDepartment.mutate(values, {
              onSuccess: () => {
                addToast({ type: 'success', message: t('orders:departments.created', { name: values.name }) })
                setCreateOpen(false)
              },
              onError: (error) => {
                const message =
                  isConflict(error) ? t('orders:departments.duplicateError') : t('orders:departments.saveError')
                addToast({ type: 'error', message })
              },
            })
          }
        />
      </Modal>

      <Modal
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title={t('orders:departments.rename')}
      >
        {renameTarget && (
          <DepartmentForm
            initialName={renameTarget.name}
            submitLabel={t('orders:departments.saveChanges')}
            isSubmitting={renameDepartment.isPending}
            onSubmit={(values) =>
              renameDepartment.mutate(
                { departmentId: renameTarget.departmentId, request: values },
                {
                  onSuccess: () => {
                    addToast({ type: 'success', message: t('orders:departments.renamed', { name: values.name }) })
                    setRenameTarget(null)
                  },
                  onError: (error) => {
                    const message =
                      isConflict(error) ? t('orders:departments.duplicateError') : t('orders:departments.saveError')
                    addToast({ type: 'error', message })
                  },
                },
              )
            }
          />
        )}
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t('orders:departments.confirmDeleteTitle')}
      >
        {deleteTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              {t('orders:departments.confirmDeleteBody', { name: deleteTarget.name })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
                {t('common:actions.close')}
              </Button>
              <Button
                variant="danger"
                disabled={deleteDepartment.isPending}
                onClick={() =>
                  deleteDepartment.mutate(deleteTarget.departmentId, {
                    onSuccess: () => {
                      addToast({ type: 'success', message: t('orders:departments.deleted', { name: deleteTarget.name }) })
                      setDeleteTarget(null)
                    },
                    onError: () => {
                      addToast({ type: 'error', message: t('orders:departments.deleteInUseError') })
                      setDeleteTarget(null)
                    },
                  })
                }
              >
                {t('common:actions.delete')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function isConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 409
}
