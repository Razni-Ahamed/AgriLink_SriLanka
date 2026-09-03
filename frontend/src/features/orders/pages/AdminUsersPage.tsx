import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { useCreateUser } from '../hooks/useAdminMetrics'
import { UserCreateForm } from '../components/UserCreateForm'

export function AdminUsersPage() {
  const { t } = useTranslation(['orders', 'common'])
  const createUser = useCreateUser()
  const [created, setCreated] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-text-primary">{t('orders:admin.usersTitle')}</h1>
        <p className="text-sm text-text-secondary">{t('orders:admin.usersSubtitle')}</p>
      </div>

      {/*
        The product brief mentions PUT /api/admin/users/{userId}/role, but the
        real AdminController only exposes POST /users and GET /metrics — no
        role-change or user-list route exists yet, so there's no control for
        it here. Flagging the gap rather than building a UI for a route that
        isn't there.
      */}

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
    </div>
  )
}
