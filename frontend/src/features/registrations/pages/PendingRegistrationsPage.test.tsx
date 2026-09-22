import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n/config'
import type { PendingRegistrationResponse } from '@/types/dto/registrations'
import { useApproveRegistration, usePendingRegistrations, useRejectRegistration } from '../hooks/useRegistrations'
import {
  useApproveChangeRequest,
  usePendingChangeRequests,
  useRejectChangeRequest,
} from '../hooks/useProfileChangeRequests'
import { PendingRegistrationsPage } from './PendingRegistrationsPage'

vi.mock('../hooks/useRegistrations', () => ({
  usePendingRegistrations: vi.fn(),
  useApproveRegistration: vi.fn(),
  useRejectRegistration: vi.fn(),
}))
vi.mock('../hooks/useProfileChangeRequests', () => ({
  usePendingChangeRequests: vi.fn(),
  useApproveChangeRequest: vi.fn(),
  useRejectChangeRequest: vi.fn(),
}))
// The real store pulls in the API client, whose settings check throws where no .env exists (CI).
vi.mock('@/auth/authStore', () => ({
  useAuthStore: <T,>(selector: (state: { role: string; user: { district: string } }) => T) =>
    selector({ role: 'Officer', user: { district: 'Kandy' } }),
}))

describe('PendingRegistrationsPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.mocked(usePendingRegistrations).mockReturnValue({
      data: [] as PendingRegistrationResponse[],
      isLoading: false,
    } as ReturnType<typeof usePendingRegistrations>)
    vi.mocked(useApproveRegistration).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useApproveRegistration>)
    vi.mocked(useRejectRegistration).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useRejectRegistration>)
    vi.mocked(usePendingChangeRequests).mockReturnValue({
      data: { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 1 },
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof usePendingChangeRequests>)
    vi.mocked(useApproveChangeRequest).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useApproveChangeRequest>)
    vi.mocked(useRejectChangeRequest).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useRejectChangeRequest>)
  })

  it('shows two tabs, Registrations selected by default', () => {
    render(<PendingRegistrationsPage />)

    expect(screen.getByRole('heading', { name: 'Approvals' })).toBeInTheDocument()
    const registrations = screen.getByRole('tab', { name: 'Registrations' })
    const profileChanges = screen.getByRole('tab', { name: 'Profile changes' })
    expect(registrations).toHaveAttribute('aria-selected', 'true')
    expect(profileChanges).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByText('No applications are waiting for review right now.')).toBeInTheDocument()
  })

  it('switches to the Profile changes tab on click', async () => {
    const user = userEvent.setup()
    render(<PendingRegistrationsPage />)

    await user.click(screen.getByRole('tab', { name: 'Profile changes' }))

    expect(screen.getByRole('tab', { name: 'Profile changes' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('No profile changes are waiting for review right now.')).toBeInTheDocument()
  })

  it('switches tabs with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<PendingRegistrationsPage />)
    screen.getByRole('tab', { name: 'Registrations' }).focus()

    await user.keyboard('{ArrowRight}')

    const profileChanges = screen.getByRole('tab', { name: 'Profile changes' })
    expect(profileChanges).toHaveFocus()
    expect(profileChanges).toHaveAttribute('aria-selected', 'true')
  })
})
