import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n/config'
import type { AdminUserSummary } from '@/types/dto/admin'
import { EditUserForm } from './EditUserForm'

vi.mock('@/lib/useDistricts', () => ({
  useDistricts: () => ({ data: ['Kandy', 'Colombo', 'Galle'], isLoading: false }),
}))

const farmer: AdminUserSummary = {
  userId: 1,
  fullName: 'Nimal Perera',
  email: 'nimal@agrilink.lk',
  username: 'nimal.perera',
  role: 'Farmer',
  district: 'Kandy',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}

const buyer: AdminUserSummary = {
  userId: 2,
  fullName: 'Silva Traders',
  email: 'buyer@agrilink.lk',
  username: 'silva.traders',
  role: 'Buyer',
  district: 'Colombo',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}

const officer: AdminUserSummary = {
  userId: 3,
  fullName: 'Officer One',
  email: 'officer@agrilink.lk',
  username: 'officer.one',
  role: 'Officer',
  district: 'Galle',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}

const admin: AdminUserSummary = {
  userId: 4,
  fullName: 'Admin One',
  email: 'admin@agrilink.lk',
  username: 'admin.one',
  role: 'Admin',
  district: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
}

describe('EditUserForm', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('offers NIC, district and field/plot number for a Farmer, not business details', () => {
    render(<EditUserForm user={farmer} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('NIC')).toBeInTheDocument()
    expect(screen.getByText('District')).toBeInTheDocument()
    expect(screen.getByLabelText('Field/plot number')).toBeInTheDocument()
    expect(screen.queryByLabelText('Business name')).not.toBeInTheDocument()
  })

  it('offers NIC, district and business details for a Buyer, not field/plot number', () => {
    render(<EditUserForm user={buyer} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('NIC')).toBeInTheDocument()
    expect(screen.getByLabelText('Business name')).toBeInTheDocument()
    expect(screen.getByLabelText('Business registration number')).toBeInTheDocument()
    expect(screen.queryByLabelText('Field/plot number')).not.toBeInTheDocument()
  })

  it('offers only district for an Officer — no NIC, business details or field/plot number', () => {
    render(<EditUserForm user={officer} onSubmit={vi.fn()} />)

    expect(screen.getByText('District')).toBeInTheDocument()
    expect(screen.queryByLabelText('NIC')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Business name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Field/plot number')).not.toBeInTheDocument()
  })

  it('offers none of district, NIC, business details or field/plot number for an Admin', () => {
    render(<EditUserForm user={admin} onSubmit={vi.fn()} />)

    expect(screen.queryByText('District')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('NIC')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Business name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Field/plot number')).not.toBeInTheDocument()
  })

  it('sends only the fields actually typed, leaving the rest out entirely', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<EditUserForm user={farmer} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Full name'), 'Nimal P. Silva')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onSubmit).toHaveBeenCalledWith({ fullName: 'Nimal P. Silva' })
  })

  it('typing the same full name and email back as current sends no changes at all', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<EditUserForm user={farmer} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Full name'), farmer.fullName)
    await user.type(screen.getByLabelText('Email'), farmer.email)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onSubmit).toHaveBeenCalledWith({})
  })

  it('flags an invalid email and does not submit', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<EditUserForm user={farmer} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('flags an invalid phone number and does not submit', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<EditUserForm user={farmer} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Phone number'), '123')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Phone number must be 10 digits')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('sends a valid NIC and phone number typed for a Farmer', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<EditUserForm user={farmer} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('NIC'), '199912345678')
    await user.type(screen.getByLabelText('Phone number'), '0771234567')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onSubmit).toHaveBeenCalledWith({ nic: '199912345678', phoneNumber: '0771234567' })
  })
})
