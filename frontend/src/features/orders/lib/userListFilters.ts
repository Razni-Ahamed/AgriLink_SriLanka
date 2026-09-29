import type { AdminUserSummary, ManagedRole } from '@/types/dto/admin'

/** The same four states the table's status badge shows. */
export type UserStatusFilter = 'active' | 'inactive' | 'pending' | 'rejected'

export type UserSort = 'newest' | 'oldest' | 'nameAsc'

export interface UserListFilters {
  search?: string
  role?: ManagedRole
  status?: UserStatusFilter
  sort?: UserSort
}

export const USERS_PAGE_SIZE = 20

export function userStatus(user: AdminUserSummary): UserStatusFilter {
  if (user.isActive) return 'active'
  if (user.registrationStatus === 'Pending') return 'pending'
  if (user.registrationStatus === 'Rejected') return 'rejected'
  return 'inactive'
}

/**
 * The admin's user list narrowed and ordered in the browser: GET /api/admin/users already returns
 * every account for the table, so searching and sorting it needs no extra round trip.
 */
export function filterAndSortUsers(
  users: AdminUserSummary[],
  filters: UserListFilters,
): AdminUserSummary[] {
  const term = filters.search?.trim().toLowerCase() ?? ''
  const matches = users.filter(
    (user) =>
      (!term ||
        user.fullName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.username.toLowerCase().includes(term)) &&
      (!filters.role || user.role === filters.role) &&
      (!filters.status || userStatus(user) === filters.status),
  )

  const sort = filters.sort ?? 'newest'
  return [...matches].sort((a, b) => {
    if (sort === 'nameAsc') return a.fullName.localeCompare(b.fullName)
    const byDate = a.createdAt.localeCompare(b.createdAt) // ISO timestamps sort as text
    return sort === 'oldest' ? byDate : -byDate
  })
}
