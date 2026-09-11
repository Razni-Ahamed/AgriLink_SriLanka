import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { AdminUserSummary, ManagedRole } from '@/types/dto/admin'

const roleBadgeVariant: Record<ManagedRole, 'info' | 'success' | 'warning' | 'neutral'> = {
  Farmer: 'info',
  Officer: 'success',
  Buyer: 'warning',
  Admin: 'neutral',
}

interface UserManagementTableProps {
  users: AdminUserSummary[]
  isMutating?: boolean
  onChangeRole: (user: AdminUserSummary) => void
  onToggleStatus: (user: AdminUserSummary) => void
}

export function UserManagementTable({
  users,
  isMutating,
  onChangeRole,
  onToggleStatus,
}: UserManagementTableProps) {
  const { t } = useTranslation(['orders', 'common'])

  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-forest/10">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-brand-forest/10 bg-bg-canvas text-text-secondary">
            <th className="px-4 py-3 font-medium">{t('common:fields.fullName')}</th>
            <th className="px-4 py-3 font-medium">{t('common:fields.email')}</th>
            <th className="px-4 py-3 font-medium">{t('common:fields.role')}</th>
            <th className="px-4 py-3 font-medium">{t('common:fields.district')}</th>
            <th className="px-4 py-3 font-medium">{t('common:fields.status')}</th>
            <th className="px-4 py-3 font-medium">{t('orders:admin.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.userId} className="border-b border-brand-forest/5 last:border-0">
              <td className="px-4 py-3 text-text-primary">{user.fullName}</td>
              <td className="px-4 py-3 text-text-secondary">{user.email}</td>
              <td className="px-4 py-3">
                <Badge variant={roleBadgeVariant[user.role]}>{t(`common:roles.${user.role}`)}</Badge>
              </td>
              <td className="px-4 py-3 text-text-secondary">{user.district ?? '—'}</td>
              <td className="px-4 py-3">
                <Badge variant={user.isActive ? 'success' : 'danger'}>
                  {user.isActive ? t('orders:admin.active') : t('orders:admin.inactive')}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {(user.role === 'Officer' || user.role === 'Buyer') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isMutating}
                      onClick={() => onChangeRole(user)}
                    >
                      {t('orders:admin.changeRole')}
                    </Button>
                  )}
                  {user.role !== 'Admin' && (
                    <Button
                      size="sm"
                      variant={user.isActive ? 'danger' : 'secondary'}
                      disabled={isMutating}
                      onClick={() => onToggleStatus(user)}
                    >
                      {user.isActive ? t('orders:admin.deactivate') : t('orders:admin.activate')}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
