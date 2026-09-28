import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n/config'
import type { PendingRegistrationResponse } from '@/types/dto/registrations'
import {
  useApproveRegistration,
  usePendingRegistrations,
  useRejectRegistration,
  useRejectedRegistrations,
} from '../hooks/useRegistrations'
import { RegistrationsTab } from './RegistrationsTab'

vi.mock('../hooks/useRegistrations', () => ({
  usePendingRegistrations: vi.fn(),
  useApproveRegistration: vi.fn(),
  useRejectRegistration: vi.fn(),
  useRejectedRegistrations: vi.fn(),
}))
// The real store pulls in the API client, whose settings check throws where no .env exists (CI).
vi.mock('@/auth/authStore', () => ({
  useAuthStore: <T,>(selector: (state: { role: string; user: { district: string } }) => T) =>
    selector({ role: 'Officer', user: { district: 'Kandy' } }),
}))

function application(overrides: Partial<PendingRegistrationResponse>): PendingRegistrationResponse {
  return {
    userId: 1,
    fullName: 'Kandy Farmer',
    email: 'farmer@test.com',
    role: 'Farmer',
    district: 'Kandy',
    nic: '123456789V',
    createdAt: '2026-09-17T10:00:00Z',
    fieldPlotNumber: 'PLOT-1',
    phoneNumber: '0771234567',
    ...overrides,
  }
}

describe('RegistrationsTab', () => {
  const approveMutate = vi.fn()
  const rejectMutate = vi.fn()

  beforeEach(async () => {
    await i18n.changeLanguage('en')
    approveMutate.mockReset()
    rejectMutate.mockReset()
    vi.mocked(useApproveRegistration).mockReturnValue({
      mutate: approveMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useApproveRegistration>)
    vi.mocked(useRejectRegistration).mockReturnValue({
      mutate: rejectMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useRejectRegistration>)
    vi.mocked(useRejectedRegistrations).mockReturnValue({
      data: [] as PendingRegistrationResponse[],
      isLoading: false,
    } as ReturnType<typeof useRejectedRegistrations>)
  })

  it('shows the officer district scoping note and the applicant details', () => {
    vi.mocked(usePendingRegistrations).mockReturnValue({
      data: [application({})],
      isLoading: false,
    } as ReturnType<typeof usePendingRegistrations>)

    render(<RegistrationsTab />)

    expect(screen.getByText('Showing Farmer applications in Kandy')).toBeInTheDocument()
    expect(screen.getByText('Kandy Farmer')).toBeInTheDocument()
    expect(screen.getByText('Farmer application')).toBeInTheDocument()
  })

  it('shows the empty state when there is nothing to review', () => {
    vi.mocked(usePendingRegistrations).mockReturnValue({
      data: [] as PendingRegistrationResponse[],
      isLoading: false,
    } as ReturnType<typeof usePendingRegistrations>)

    render(<RegistrationsTab />)

    expect(
      screen.getByText('No applications are waiting for review right now.'),
    ).toBeInTheDocument()
  })

  it('approve calls the approve mutation with that applicant', async () => {
    vi.mocked(usePendingRegistrations).mockReturnValue({
      data: [application({})],
      isLoading: false,
    } as ReturnType<typeof usePendingRegistrations>)
    const user = userEvent.setup()

    render(<RegistrationsTab />)
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(approveMutate).toHaveBeenCalledWith(1)
  })

  it('reject opens a reason prompt and calls the reject mutation with the typed reason', async () => {
    vi.mocked(usePendingRegistrations).mockReturnValue({
      data: [application({})],
      isLoading: false,
    } as ReturnType<typeof usePendingRegistrations>)
    const user = userEvent.setup()

    render(<RegistrationsTab />)
    await user.click(screen.getByRole('button', { name: 'Reject' }))
    await user.type(screen.getByLabelText('Reason for rejection'), 'NIC mismatch')
    await user.click(screen.getByRole('button', { name: 'Reject application' }))

    expect(rejectMutate).toHaveBeenCalledWith({ userId: 1, request: { reason: 'NIC mismatch' } })
  })

  it('never renders a Buyer application row for an Officer, even if the API returned one', () => {
    vi.mocked(usePendingRegistrations).mockReturnValue({
      data: [application({ role: 'Farmer' })],
      isLoading: false,
    } as ReturnType<typeof usePendingRegistrations>)

    render(<RegistrationsTab />)

    expect(screen.queryByText('Buyer application')).not.toBeInTheDocument()
  })

  it('shows a Buyer application for an Admin with its business details', () => {
    vi.mocked(usePendingRegistrations).mockReturnValue({
      data: [
        application({
          userId: 2,
          fullName: 'Test Buyer',
          role: 'Buyer',
          nic: undefined,
          fieldPlotNumber: undefined,
          phoneNumber: undefined,
          businessRegistrationNumber: 'BRN-1',
          businessPhone: '0779876543',
          legalBusinessName: 'Buyer Traders Ltd',
        }),
      ],
      isLoading: false,
    } as ReturnType<typeof usePendingRegistrations>)

    render(<RegistrationsTab />)

    const row = within(screen.getByText('Test Buyer').closest('div.rounded-2xl') as HTMLElement)
    expect(row.getByText('Buyer application')).toBeInTheDocument()
    expect(row.getByText('Business: Buyer Traders Ltd')).toBeInTheDocument()
  })

  describe('rejected applications', () => {
    beforeEach(() => {
      vi.mocked(usePendingRegistrations).mockReturnValue({
        data: [] as PendingRegistrationResponse[],
        isLoading: false,
      } as ReturnType<typeof usePendingRegistrations>)
    })

    it('says so when nothing has been rejected', () => {
      render(<RegistrationsTab />)

      expect(screen.getByRole('heading', { name: 'Rejected applications' })).toBeInTheDocument()
      expect(screen.getByText('No applications have been rejected.')).toBeInTheDocument()
    })

    it('lists each rejection with its reason and date', () => {
      vi.mocked(useRejectedRegistrations).mockReturnValue({
        data: [
          application({
            userId: 7,
            fullName: 'Rejected Farmer',
            rejectionReason: 'NIC mismatch',
            rejectedAt: '2026-09-20T08:00:00Z',
          }),
        ],
        isLoading: false,
      } as ReturnType<typeof useRejectedRegistrations>)

      render(<RegistrationsTab />)

      expect(screen.getByRole('heading', { name: /Rejected applications/ })).toHaveTextContent(
        '(1)',
      )
      expect(screen.getByText('Rejected Farmer')).toBeInTheDocument()
      expect(screen.getByText('Reason: NIC mismatch')).toBeInTheDocument()
      expect(screen.getByText(/^Rejected .*2026/)).toBeInTheDocument()
    })

    it('asks for confirmation before approving a rejected application, and cancelling does nothing', async () => {
      vi.mocked(useRejectedRegistrations).mockReturnValue({
        data: [
          application({ userId: 7, fullName: 'Rejected Farmer', rejectionReason: 'NIC mismatch' }),
        ],
        isLoading: false,
      } as ReturnType<typeof useRejectedRegistrations>)
      const user = userEvent.setup()
      render(<RegistrationsTab />)

      await user.click(screen.getByRole('button', { name: 'Approve anyway' }))
      expect(screen.getByText(/^Approve Rejected Farmer\?/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(approveMutate).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: 'Approve anyway' }))
      await user.click(screen.getByRole('button', { name: 'Yes, approve' }))
      expect(approveMutate).toHaveBeenCalledWith(7, expect.anything())
    })
  })
})
