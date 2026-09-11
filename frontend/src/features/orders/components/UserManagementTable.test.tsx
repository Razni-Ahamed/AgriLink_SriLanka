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
  role: 'Officer',
  district: 'Kandy',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}

const farmer: AdminUserSummary = {
  userId: 2,
  fullName: 'Farmer One',
  email: 'farmer@agrilink.lk',
  role: 'Farmer',
  district: 'Galle',
  isActive: false,
  createdAt: '2026-01-02T00:00:00Z',
}

const admin: AdminUserSummary = {
  userId: 3,
  fullName: 'Admin One',
  email: 'admin@agrilink.lk',
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

  it('offers Change Role and Deactivate for an active Officer, and calls back with that user', async () => {
    const onChangeRole = vi.fn()
    const onToggleStatus = vi.fn()
    const user = userEvent.setup()

    render(
      <UserManagementTable users={[officer]} onChangeRole={onChangeRole} onToggleStatus={onToggleStatus} />,
    )

    const row = within(rowFor('Officer One'))
    await user.click(row.getByRole('button', { name: 'Change Role' }))
    expect(onChangeRole).toHaveBeenCalledWith(officer)

    await user.click(row.getByRole('button', { name: 'Deactivate' }))
    expect(onToggleStatus).toHaveBeenCalledWith(officer)
  })

  it('offers Activate (not Change Role) for an inactive Farmer', () => {
    render(<UserManagementTable users={[farmer]} onChangeRole={vi.fn()} onToggleStatus={vi.fn()} />)

    const row = within(rowFor('Farmer One'))
    expect(row.queryByRole('button', { name: 'Change Role' })).not.toBeInTheDocument()
    expect(row.getByRole('button', { name: 'Activate' })).toBeInTheDocument()
  })

  it('offers no actions at all for an Admin account', () => {
    render(<UserManagementTable users={[admin]} onChangeRole={vi.fn()} onToggleStatus={vi.fn()} />)

    const row = within(rowFor('Admin One'))
    expect(row.queryByRole('button')).not.toBeInTheDocument()
  })
})
