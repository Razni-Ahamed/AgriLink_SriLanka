import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCreateUser } from '../hooks/useAdminMetrics'
import { useAdminUsers, useUpdateUserRole, useUpdateUserStatus } from '../hooks/useAdminUsers'
import { UserCreateForm } from '../components/UserCreateForm'
import { ChangeRoleForm } from '../components/ChangeRoleForm'
import { UserManagementTable } from '../components/UserManagementTable'
import type { AdminUserSummary } from '@/types/dto/admin'

export function AdminUsersPage() {
  const { t } = useTranslation(['orders', 'common'])
  const createUser = useCreateUser()
  const [created, setCreated] = useState<string | null>(null)

  const { data: users, isLoading: isLoadingUsers, isError: isUsersError } = useAdminUsers()
  const updateRole = useUpdateUserRole()
  const updateStatus = useUpdateUserStatus()

  const [roleTarget, setRoleTarget] = useState<AdminUserSummary | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  const handleToggleStatus = (user: AdminUserSummary) => {
    updateStatus.mutate(
      { userId: user.userId, request: { isActive: !user.isActive } },
      {
        onSuccess: () =>
          setFeedback({
            tone: 'success',
            text: user.isActive
              ? t('orders:admin.userDeactivated', { name: user.fullName })
              : t('orders:admin.userActivated', { name: user.fullName }),
          }),
        onError: () => setFeedback({ tone: 'danger', text: t('orders:admin.statusUpdateError') }),
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-text-primary">{t('orders:admin.usersTitle')}</h1>
        <p className="text-sm text-text-secondary">{t('orders:admin.usersSubtitle')}</p>
      </div>

      <Card className="max-w-md">
        <UserCreateForm
          isSubmitting={createUser.isPending}
          onSubmit={(values) =>
            createUser.mutate(values, {
              onSuccess: (user) =>
                setCreated(
                  t('orders:admin.userCreated', { name: user.fullName, role: user.role }),
                ),
            })
          }
        />
      </Card>

      {created && <p className="text-sm text-state-success">{created}</p>}
      {createUser.isError && (
        <p className="text-sm text-state-danger">{t('orders:admin.createUserError')}</p>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-xl text-text-primary">{t('orders:admin.manageExisting')}</h2>

        {isLoadingUsers && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        )}

        {isUsersError && <p className="text-sm text-state-danger">{t('orders:admin.loadUsersError')}</p>}

        {!isLoadingUsers && !isUsersError && users && users.length === 0 && (
          <p className="text-sm text-text-secondary">{t('orders:admin.noUsers')}</p>
        )}

        {!isLoadingUsers && !isUsersError && users && users.length > 0 && (
          <UserManagementTable
            users={users}
            isMutating={updateRole.isPending || updateStatus.isPending}
            onChangeRole={setRoleTarget}
            onToggleStatus={handleToggleStatus}
          />
        )}

        {feedback && (
          <p className={feedback.tone === 'success' ? 'text-sm text-state-success' : 'text-sm text-state-danger'}>
            {feedback.text}
          </p>
        )}
      </div>

      <Modal
        open={roleTarget !== null}
        onClose={() => setRoleTarget(null)}
        title={t('orders:admin.changeRole')}
      >
        {roleTarget && (
          <ChangeRoleForm
            user={roleTarget}
            isSubmitting={updateRole.isPending}
            onSubmit={(values) =>
              updateRole.mutate(
                { userId: roleTarget.userId, request: values },
                {
                  onSuccess: () => {
                    setFeedback({
                      tone: 'success',
                      text: t('orders:admin.roleUpdated', { name: roleTarget.fullName, role: values.role }),
                    })
                    setRoleTarget(null)
                  },
                  onError: () => setFeedback({ tone: 'danger', text: t('orders:admin.roleUpdateError') }),
                },
              )
            }
          />
        )}
      </Modal>
    </div>
  )
}
