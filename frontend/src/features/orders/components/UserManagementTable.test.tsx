import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@/i18n/config'
import i18n from '@/i18n/config'
import { UserManagementTable } from './UserManagementTable'
import type { AdminUserSummary } from '@/types/dto/admin'

const officer: AdminUserSummary = {
  userId: 1,
  fullName: 'Officer One',
  email: 'officer@agrilink.lk',
  username: 'officer.one',
  profilePhotoUrl: 'https://res.cloudinary.com/demo/image/upload/officer.jpg',
  role: 'Officer',
  district: 'Kandy',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}

const farmer: AdminUserSummary = {
  userId: 2,
  fullName: 'Farmer One',
  email: 'farmer@agrilink.lk',
  username: 'farmer.one',
  role: 'Farmer',
  district: 'Galle',
  isActive: false,
  createdAt: '2026-01-02T00:00:00Z',
}

const admin: AdminUserSummary = {
  userId: 3,
  fullName: 'Admin One',
  email: 'admin@agrilink.lk',
  username: 'admin.one',
  role: 'Admin',
  district: null,
  isActive: true,
  createdAt: '2026-01-03T00:00:00Z',
}

function rowFor(name: string) {
  return screen.getByText(name).closest('tr') as HTMLTableRowElement
}

describe('UserManagementTable', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('offers Edit, Change Role, Deactivate and Reset password for an active Officer, and calls back with that user', async () => {
    const onChangeRole = vi.fn()
    const onToggleStatus = vi.fn()
    const onResetPassword = vi.fn()
    const onEditUser = vi.fn()
    const user = userEvent.setup()

    render(
      <UserManagementTable
        users={[officer]}
        onChangeRole={onChangeRole}
        onToggleStatus={onToggleStatus}
        onResetPassword={onResetPassword}
        onEditUser={onEditUser}
      />,
    )

    const row = within(rowFor('Officer One'))
    await user.click(row.getByRole('button', { name: 'Edit' }))
    expect(onEditUser).toHaveBeenCalledWith(officer)

    await user.click(row.getByRole('button', { name: 'Change Role' }))
    expect(onChangeRole).toHaveBeenCalledWith(officer)

    await user.click(row.getByRole('button', { name: 'Deactivate' }))
    expect(onToggleStatus).toHaveBeenCalledWith(officer)

    await user.click(row.getByRole('button', { name: 'Reset password' }))
    expect(onResetPassword).toHaveBeenCalledWith(officer)
  })

  it('offers Activate (not Change Role) for an inactive Farmer', () => {
    render(
      <UserManagementTable
        users={[farmer]}
        onChangeRole={vi.fn()}
        onToggleStatus={vi.fn()}
        onResetPassword={vi.fn()}
        onEditUser={vi.fn()}
      />,
    )

    const row = within(rowFor('Farmer One'))
    expect(row.queryByRole('button', { name: 'Change Role' })).not.toBeInTheDocument()
    expect(row.getByRole('button', { name: 'Activate' })).toBeInTheDocument()
  })

  it('offers Edit and Reset password, but not Change Role or Deactivate, for another Admin account', () => {
    render(
      <UserManagementTable
        users={[admin]}
        onChangeRole={vi.fn()}
        onToggleStatus={vi.fn()}
        onResetPassword={vi.fn()}
        onEditUser={vi.fn()}
      />,
    )

    const row = within(rowFor('Admin One'))
    expect(row.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(row.getByRole('button', { name: 'Reset password' })).toBeInTheDocument()
    expect(row.queryByRole('button', { name: 'Change Role' })).not.toBeInTheDocument()
    expect(row.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument()
  })

  it('offers only Edit on the signed-in admin\'s own row', () => {
    render(
      <UserManagementTable
        users={[admin]}
        currentUserId={admin.userId}
        onChangeRole={vi.fn()}
        onToggleStatus={vi.fn()}
        onResetPassword={vi.fn()}
        onEditUser={vi.fn()}
      />,
    )

    const row = within(rowFor('Admin One'))
    expect(row.getAllByRole('button')).toHaveLength(1)
    expect(row.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('shows usernames in their own column, and each photo or role default beside the name', () => {
    render(
      <UserManagementTable
        users={[officer, farmer]}
        onChangeRole={vi.fn()}
        onToggleStatus={vi.fn()}
        onResetPassword={vi.fn()}
        onEditUser={vi.fn()}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Username' })).toBeInTheDocument()
    expect(within(rowFor('Officer One')).getByText('officer.one')).toBeInTheDocument()

    const officerAvatar = within(rowFor('Officer One')).getByRole('img', { name: 'Officer One' })
    expect(officerAvatar).toHaveAttribute('src', officer.profilePhotoUrl)
    // No photo: the role's default picture, still named for screen readers.
    expect(within(rowFor('Farmer One')).getByRole('img', { name: 'Farmer One' }).tagName).toBe('SPAN')
  })
})
