import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import type { ReactNode } from 'react'
import { ArrowsLeftRight, CheckCircle, Key, PencilSimple, Prohibit } from '@phosphor-icons/react'
import { UserAvatar } from '@/components/ui/UserAvatar'
import type { AdminUserSummary, ManagedRole } from '@/types/dto/admin'
import { cn } from '@/lib/utils'

const roleBadgeVariant: Record<ManagedRole, 'info' | 'success' | 'warning' | 'neutral'> = {
  Farmer: 'info',
  Officer: 'success',
  Buyer: 'warning',
  Admin: 'neutral',
}

const actionTones = {
  neutral: 'text-brand-forest hover:bg-brand-forest/10',
  danger: 'text-state-danger hover:bg-state-danger/10',
  positive: 'text-state-success hover:bg-state-success/10',
} as const

/**
 * A row action as a compact icon button, named by its tooltip and for screen readers. Four text
 * buttons made the column too wide: they wrapped onto three lines, or on one line pushed the table
 * past the page. `showLabel` spells one out beside its icon: Approve, the action an applicant's row
 * is waiting on, shouldn't be a tick someone has to hover to understand.
 */
function ActionButton({
  label,
  icon,
  tone = 'neutral',
  disabled,
  showLabel = false,
  onClick,
}: {
  label: string
  icon: ReactNode
  tone?: keyof typeof actionTones
  showLabel?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={showLabel ? undefined : label}
      title={showLabel ? undefined : label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        showLabel ? 'gap-1.5 px-2.5 text-xs font-semibold' : 'w-8',
        'focus-visible:outline-2 focus-visible:outline-brand-forest',
        actionTones[tone],
      )}
    >
      {icon}
      {showLabel && label}
    </button>
  )
}

interface UserManagementTableProps {
  users: AdminUserSummary[]
  /** The signed-in admin's own user id — hides self-service actions on their own row. */
  currentUserId?: number
  isMutating?: boolean
  onChangeRole: (user: AdminUserSummary) => void
  onToggleStatus: (user: AdminUserSummary) => void
  onResetPassword: (user: AdminUserSummary) => void
  onEditUser: (user: AdminUserSummary) => void
}

/**
 * An inactive account is either deactivated, or a sign-up still waiting for (or refused) approval.
 * Both used to show as "Inactive", which hid why the person couldn't sign in.
 */
type StatusLabelKey =
  | 'orders:admin.active'
  | 'orders:admin.inactive'
  | 'orders:admin.statusPending'
  | 'orders:admin.statusRejected'

function statusBadge(user: AdminUserSummary): {
  variant: 'success' | 'danger' | 'warning'
  labelKey: StatusLabelKey
} {
  if (user.isActive) {
    return { variant: 'success', labelKey: 'orders:admin.active' }
  }
  if (user.registrationStatus === 'Pending') {
    return { variant: 'warning', labelKey: 'orders:admin.statusPending' }
  }
  if (user.registrationStatus === 'Rejected') {
    return { variant: 'danger', labelKey: 'orders:admin.statusRejected' }
  }
  return { variant: 'danger', labelKey: 'orders:admin.inactive' }
}

export function UserManagementTable({
  users,
  currentUserId,
  isMutating,
  onChangeRole,
  onToggleStatus,
  onResetPassword,
  onEditUser,
}: UserManagementTableProps) {
  const { t } = useTranslation(['orders', 'common'])

  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-forest/10">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-brand-forest/10 bg-bg-canvas text-text-secondary">
            <th className="px-4 py-3 font-medium">{t('common:fields.fullName')}</th>
            <th className="px-4 py-3 font-medium">{t('common:fields.username')}</th>
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
              <td className="px-4 py-3 text-text-primary">
                <span className="flex items-center gap-2">
                  <UserAvatar
                    photoUrl={user.profilePhotoUrl}
                    role={user.role}
                    name={user.fullName}
                    size="sm"
                  />
                  {user.fullName}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-text-secondary">{user.username}</td>
              <td className="px-4 py-3 text-text-secondary">{user.email}</td>
              <td className="px-4 py-3">
                <Badge variant={roleBadgeVariant[user.role]}>
                  {t(`common:roles.${user.role}`)}
                </Badge>
              </td>
              <td className="px-4 py-3 text-text-secondary">{user.district ?? '—'}</td>
              <td className="px-4 py-3">
                <Badge variant={statusBadge(user).variant}>{t(statusBadge(user).labelKey)}</Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <ActionButton
                    label={t('orders:admin.editUser')}
                    icon={<PencilSimple size={18} weight="duotone" />}
                    disabled={isMutating}
                    onClick={() => onEditUser(user)}
                  />
                  {(user.role === 'Officer' || user.role === 'Buyer') && (
                    <ActionButton
                      label={t('orders:admin.changeRole')}
                      icon={<ArrowsLeftRight size={18} weight="duotone" />}
                      disabled={isMutating}
                      onClick={() => onChangeRole(user)}
                    />
                  )}
                  {/* Hidden on the admin's own row — they use Change password (self-service)
                      instead, which the backend's own /admin/users/{id}/password also refuses. */}
                  {user.userId !== currentUserId && (
                    <ActionButton
                      label={t('orders:admin.resetPassword')}
                      icon={<Key size={18} weight="duotone" />}
                      disabled={isMutating}
                      onClick={() => onResetPassword(user)}
                    />
                  )}
                  {user.role !== 'Admin' && (
                    <ActionButton
                      label={
                        user.isActive
                          ? t('orders:admin.deactivate')
                          : user.registrationStatus === 'Approved'
                            ? t('orders:admin.activate')
                            : t('orders:admin.approve')
                      }
                      icon={
                        user.isActive ? (
                          <Prohibit size={18} weight="duotone" />
                        ) : (
                          <CheckCircle size={18} weight="duotone" />
                        )
                      }
                      tone={user.isActive ? 'danger' : 'positive'}
                      showLabel={!user.isActive && user.registrationStatus !== 'Approved'}
                      disabled={isMutating}
                      onClick={() => onToggleStatus(user)}
                    />
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
