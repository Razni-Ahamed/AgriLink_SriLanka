import { describe, expect, it } from 'vitest'
import type { AdminUserSummary } from '@/types/dto/admin'
import { filterAndSortUsers, userStatus } from './userListFilters'

function user(overrides: Partial<AdminUserSummary>): AdminUserSummary {
  return {
    userId: 1,
    fullName: 'User',
    email: 'user@agrilink.lk',
    username: 'user',
    role: 'Farmer',
    isActive: true,
    registrationStatus: 'Approved',
    createdAt: '2026-09-01T00:00:00Z',
    ...overrides,
  }
}

const users = [
  user({
    userId: 1,
    fullName: 'Kamal Perera',
    email: 'kamal@agrilink.lk',
    username: 'kamal',
    createdAt: '2026-09-01T00:00:00Z',
  }),
  user({
    userId: 2,
    fullName: 'Amali Silva',
    role: 'Buyer',
    username: 'silva.traders',
    createdAt: '2026-09-03T00:00:00Z',
  }),
  user({
    userId: 3,
    fullName: 'Nuwan Bandara',
    role: 'Officer',
    isActive: false,
    createdAt: '2026-09-02T00:00:00Z',
  }),
  user({
    userId: 4,
    fullName: 'Pending Farmer',
    isActive: false,
    registrationStatus: 'Pending',
    createdAt: '2026-09-04T00:00:00Z',
  }),
  user({
    userId: 5,
    fullName: 'Refused Buyer',
    role: 'Buyer',
    isActive: false,
    registrationStatus: 'Rejected',
    createdAt: '2026-09-05T00:00:00Z',
  }),
]
const ids = (list: AdminUserSummary[]) => list.map((u) => u.userId)

describe('filterAndSortUsers', () => {
  it('lists the newest accounts first by default', () => {
    expect(ids(filterAndSortUsers(users, {}))).toEqual([5, 4, 2, 3, 1])
  })

  it('sorts oldest first or by name on request', () => {
    expect(ids(filterAndSortUsers(users, { sort: 'oldest' }))).toEqual([1, 3, 2, 4, 5])
    expect(ids(filterAndSortUsers(users, { sort: 'nameAsc' }))).toEqual([2, 1, 3, 4, 5])
  })

  it('searches the name, email and username, ignoring case and spaces', () => {
    expect(ids(filterAndSortUsers(users, { search: '  KAMAL@ ' }))).toEqual([1])
    expect(ids(filterAndSortUsers(users, { search: 'traders' }))).toEqual([2])
    expect(ids(filterAndSortUsers(users, { search: 'bandara' }))).toEqual([3])
  })

  it('filters by role and by the status the table shows, together with the search', () => {
    expect(ids(filterAndSortUsers(users, { role: 'Buyer' }))).toEqual([5, 2])
    expect(ids(filterAndSortUsers(users, { status: 'pending' }))).toEqual([4])
    expect(ids(filterAndSortUsers(users, { status: 'inactive' }))).toEqual([3])
    expect(
      ids(filterAndSortUsers(users, { role: 'Buyer', status: 'rejected', search: 'refused' })),
    ).toEqual([5])
  })

  it('does not reorder the list it was given', () => {
    const copy = [...users]
    filterAndSortUsers(users, { sort: 'nameAsc' })
    expect(users).toEqual(copy)
  })
})

describe('userStatus', () => {
  it('tells a deactivated account from a sign-up waiting for or refused approval', () => {
    expect(users.map(userStatus)).toEqual(['active', 'active', 'inactive', 'pending', 'rejected'])
  })
})
