import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { SearchSortBar } from '@/components/ui/SearchSortBar'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/auth/authStore'
import { parseApiError } from '@/lib/apiErrors'
import { useCreateUser } from '../hooks/useAdminMetrics'
import {
  useAdminResetPassword,
  useAdminUsers,
  useUpdateUserProfile,
  useUpdateUserRole,
  useUpdateUserStatus,
} from '../hooks/useAdminUsers'
import { UserCreateForm } from '../components/UserCreateForm'
import { ChangeRoleForm } from '../components/ChangeRoleForm'
import { AdminResetPasswordForm } from '../components/AdminResetPasswordForm'
import { EditUserForm } from '../components/EditUserForm'
import { UserManagementTable } from '../components/UserManagementTable'
import {
  USERS_PAGE_SIZE,
  filterAndSortUsers,
  type UserSort,
  type UserStatusFilter,
} from '../lib/userListFilters'
import type { AdminUserSummary, ManagedRole } from '@/types/dto/admin'

const ROLES: ManagedRole[] = ['Farmer', 'Buyer', 'Officer', 'Admin']
const STATUS_LABEL_KEYS = {
  active: 'orders:admin.active',
  pending: 'orders:admin.statusPending',
  rejected: 'orders:admin.statusRejected',
  inactive: 'orders:admin.inactive',
} as const satisfies Record<UserStatusFilter, string>

export function AdminUsersPage() {
  const { t } = useTranslation(['orders', 'common'])
  const currentUserId = useAuthStore((state) => state.user?.userId)
  const createUser = useCreateUser()
  const [created, setCreated] = useState<string | null>(null)
  const [createUserError, setCreateUserError] = useState<string | null>(null)

  const { data: users, isLoading: isLoadingUsers, isError: isUsersError } = useAdminUsers()

  const [search, setSearch] = useState('')
  const [role, setRole] = useState<ManagedRole | ''>('')
  const [status, setStatus] = useState<UserStatusFilter | ''>('')
  const [sort, setSort] = useState<UserSort>('newest')
  // Back to page 1 whenever the search, filters or order change (see AllIssuesPage).
  const filterKey = `${search}|${role}|${status}|${sort}`
  const [paging, setPaging] = useState({ key: filterKey, page: 1 })
  const visibleUsers = filterAndSortUsers(users ?? [], {
    search,
    role: role || undefined,
    status: status || undefined,
    sort,
  })
  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / USERS_PAGE_SIZE))
  const page = Math.min(paging.key === filterKey ? paging.page : 1, totalPages)
  const pageUsers = visibleUsers.slice((page - 1) * USERS_PAGE_SIZE, page * USERS_PAGE_SIZE)
  const updateRole = useUpdateUserRole()
  const updateStatus = useUpdateUserStatus()
  const resetPassword = useAdminResetPassword()
  const updateProfile = useUpdateUserProfile()

  const [roleTarget, setRoleTarget] = useState<AdminUserSummary | null>(null)
  const [passwordTarget, setPasswordTarget] = useState<AdminUserSummary | null>(null)
  const [editTarget, setEditTarget] = useState<AdminUserSummary | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; text: string } | null>(
    null,
  )

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

      <Card>
        <UserCreateForm
          isSubmitting={createUser.isPending}
          onSubmit={(values) =>
            createUser.mutate(values, {
              onSuccess: (user) => {
                setCreateUserError(null)
                setCreated(
                  t('orders:admin.userCreatedWithUsername', {
                    name: user.fullName,
                    role: user.role,
                    username: user.username,
                  }),
                )
              },
              onError: (error) => {
                const parsed = parseApiError(error, t, {
                  genericErrorKey: 'orders:admin.createUserError',
                })
                setCreateUserError(parsed.generalErrors[0] ?? t('orders:admin.createUserError'))
              },
            })
          }
        />
      </Card>

      {created && <p className="text-sm text-state-success">{created}</p>}
      {createUserError && <p className="text-sm text-state-danger">{createUserError}</p>}

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-xl text-text-primary">
          {t('orders:admin.manageExisting')}
        </h2>

        {isLoadingUsers && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        )}

        {isUsersError && (
          <p className="text-sm text-state-danger">{t('orders:admin.loadUsersError')}</p>
        )}

        {!isLoadingUsers && !isUsersError && users && users.length === 0 && (
          <p className="text-sm text-text-secondary">{t('orders:admin.noUsers')}</p>
        )}

        {!isLoadingUsers && !isUsersError && users && users.length > 0 && (
          <SearchSortBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t('common:list.searchUsers')}
            sort={sort}
            onSortChange={(value) => setSort(value as UserSort)}
            sortOptions={[
              { value: 'newest', label: t('common:list.newest') },
              { value: 'oldest', label: t('common:list.oldest') },
              { value: 'nameAsc', label: t('common:list.nameAsc') },
            ]}
          >
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t('common:fields.role')}
                value={role}
                onChange={(event) => setRole(event.target.value as ManagedRole | '')}
              >
                <option value="">{t('common:list.anyRole')}</option>
                {ROLES.map((value) => (
                  <option key={value} value={value}>
                    {t(`common:roles.${value}`)}
                  </option>
                ))}
              </Select>
              <Select
                label={t('common:fields.status')}
                value={status}
                onChange={(event) => setStatus(event.target.value as UserStatusFilter | '')}
              >
                <option value="">{t('common:list.anyStatus')}</option>
                {(Object.keys(STATUS_LABEL_KEYS) as UserStatusFilter[]).map((value) => (
                  <option key={value} value={value}>
                    {t(STATUS_LABEL_KEYS[value])}
                  </option>
                ))}
              </Select>
            </div>
          </SearchSortBar>
        )}

        {!isLoadingUsers && !isUsersError && users && users.length > 0 && (
          <p className="text-sm text-text-secondary" aria-live="polite">
            {t('common:list.showing', { shown: visibleUsers.length, total: users.length })}
          </p>
        )}

        {!isLoadingUsers &&
          !isUsersError &&
          users &&
          users.length > 0 &&
          visibleUsers.length === 0 && (
            <p className="text-sm text-text-secondary">{t('common:list.noMatches')}</p>
          )}

        {!isLoadingUsers && !isUsersError && pageUsers.length > 0 && (
          <UserManagementTable
            users={pageUsers}
            currentUserId={currentUserId}
            isMutating={updateRole.isPending || updateStatus.isPending}
            onChangeRole={setRoleTarget}
            onToggleStatus={handleToggleStatus}
            onResetPassword={setPasswordTarget}
            onEditUser={(user) => {
              setEditError(null)
              setEditTarget(user)
            }}
          />
        )}

        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(next) => setPaging({ key: filterKey, page: next })}
          />
        )}

        {feedback && (
          <p
            className={
              feedback.tone === 'success'
                ? 'text-sm text-state-success'
                : 'text-sm text-state-danger'
            }
          >
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
                      text: t('orders:admin.roleUpdated', {
                        name: roleTarget.fullName,
                        role: values.role,
                      }),
                    })
                    setRoleTarget(null)
                  },
                  // The server says why a change is refused (e.g. a buyer with purchase history
                  // can't become an Officer), which the generic message alone would hide.
                  onError: (error) =>
                    setFeedback({
                      tone: 'danger',
                      text:
                        parseApiError(error, t, { genericErrorKey: 'orders:admin.roleUpdateError' })
                          .generalErrors[0] ?? t('orders:admin.roleUpdateError'),
                    }),
                },
              )
            }
          />
        )}
      </Modal>

      <Modal
        open={passwordTarget !== null}
        onClose={() => setPasswordTarget(null)}
        title={
          passwordTarget
            ? t('orders:admin.resetPasswordFor', { name: passwordTarget.fullName })
            : ''
        }
      >
        {passwordTarget && (
          <AdminResetPasswordForm
            isSubmitting={resetPassword.isPending}
            onSubmit={(values) =>
              resetPassword.mutate(
                { userId: passwordTarget.userId, request: { newPassword: values.newPassword } },
                {
                  onSuccess: () => {
                    setFeedback({
                      tone: 'success',
                      text: t('orders:admin.passwordReset', { name: passwordTarget.fullName }),
                    })
                    setPasswordTarget(null)
                  },
                  onError: () =>
                    setFeedback({ tone: 'danger', text: t('orders:admin.resetPasswordError') }),
                },
              )
            }
          />
        )}
      </Modal>

      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={editTarget ? t('orders:admin.editUserFor', { name: editTarget.fullName }) : ''}
      >
        {editTarget && (
          <div className="flex flex-col gap-3">
            {editError && <p className="text-sm text-state-danger">{editError}</p>}
            <EditUserForm
              user={editTarget}
              isSubmitting={updateProfile.isPending}
              onSubmit={(changes) => {
                if (Object.keys(changes).length === 0) {
                  setEditError(null)
                  setFeedback({ tone: 'success', text: t('orders:admin.editUserNoChanges') })
                  setEditTarget(null)
                  return
                }
                updateProfile.mutate(
                  { userId: editTarget.userId, request: changes },
                  {
                    onSuccess: () => {
                      setEditError(null)
                      setFeedback({
                        tone: 'success',
                        text: t('orders:admin.editUserUpdated', { name: editTarget.fullName }),
                      })
                      setEditTarget(null)
                    },
                    onError: (error) => {
                      const parsed = parseApiError(error, t, {
                        genericErrorKey: 'orders:admin.editUserError',
                        conflictKey: 'orders:admin.editUserEmailTaken',
                      })
                      setEditError(parsed.generalErrors[0] ?? t('orders:admin.editUserError'))
                    },
                  },
                )
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
