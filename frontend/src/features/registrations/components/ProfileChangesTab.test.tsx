import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import i18n from '@/i18n/config'
import { useUiStore } from '@/lib/useUiStore'
import type { PendingChangeRequestResponse } from '../api/profileChangeRequestsApi'
import {
  useApproveChangeRequest,
  usePendingChangeRequests,
  useRejectChangeRequest,
} from '../hooks/useProfileChangeRequests'
import { ProfileChangesTab } from './ProfileChangesTab'

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

function request(overrides: Partial<PendingChangeRequestResponse> = {}): PendingChangeRequestResponse {
  return {
    requestId: 5,
    userId: 7,
    fullName: 'Nimal Perera',
    username: 'nimal.perera',
    role: 'Farmer',
    profilePhotoUrl: null,
    district: 'Kandy',
    field: 'Email',
    oldValue: 'nimal@agrilink.lk',
    newValue: 'nimal.new@agrilink.lk',
    requestedAt: '2026-09-20T00:00:00Z',
    ...overrides,
  }
}

/** Matches the real shape ProfileChangeRequestsController.Approve returns on a wrong password. */
function wrongPassword(): AxiosError {
  const error = new AxiosError('Request failed', '400')
  error.response = {
    status: 400,
    data: { message: 'Current password is incorrect.' },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  return error
}

const toastMessages = () => useUiStore.getState().toasts.map((toast) => toast.message)

describe('ProfileChangesTab', () => {
  const approveMutateAsync = vi.fn()
  const rejectMutateAsync = vi.fn()

  beforeEach(async () => {
    await i18n.changeLanguage('en')
    useUiStore.setState({ toasts: [] })
    approveMutateAsync.mockReset()
    rejectMutateAsync.mockReset()
    vi.mocked(useApproveChangeRequest).mockReturnValue({
      mutateAsync: approveMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useApproveChangeRequest>)
    vi.mocked(useRejectChangeRequest).mockReturnValue({
      mutateAsync: rejectMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useRejectChangeRequest>)
  })

  it('shows the officer district scoping note and the requested change', () => {
    vi.mocked(usePendingChangeRequests).mockReturnValue({
      data: { items: [request()], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof usePendingChangeRequests>)

    render(<ProfileChangesTab />)

    expect(screen.getByText('Showing Farmer requests in Kandy')).toBeInTheDocument()
    expect(screen.getByText('Nimal Perera')).toBeInTheDocument()
    expect(screen.getByText('Current: nimal@agrilink.lk')).toBeInTheDocument()
    expect(screen.getByText('Requested: nimal.new@agrilink.lk')).toBeInTheDocument()
  })

  it('shows the empty state when there is nothing to review', () => {
    vi.mocked(usePendingChangeRequests).mockReturnValue({
      data: { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 1 },
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof usePendingChangeRequests>)

    render(<ProfileChangesTab />)

    expect(screen.getByText('No profile changes are waiting for review right now.')).toBeInTheDocument()
  })

  it('approve opens a password prompt; the wrong password shows an inline error and stays open', async () => {
    vi.mocked(usePendingChangeRequests).mockReturnValue({
      data: { items: [request()], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof usePendingChangeRequests>)
    approveMutateAsync.mockRejectedValue(wrongPassword())
    const user = userEvent.setup()

    render(<ProfileChangesTab />)
    await user.click(screen.getByRole('button', { name: 'Approve' }))
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Approve change' }))

    expect(await screen.findByText('Current password is incorrect.')).toBeInTheDocument()
    expect(approveMutateAsync).toHaveBeenCalledWith({ requestId: 5, currentPassword: 'wrong-password' })
  })

  it('approve with the correct password submits and closes, toasting success', async () => {
    vi.mocked(usePendingChangeRequests).mockReturnValue({
      data: { items: [request()], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof usePendingChangeRequests>)
    approveMutateAsync.mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(<ProfileChangesTab />)
    await user.click(screen.getByRole('button', { name: 'Approve' }))
    await user.type(screen.getByLabelText('Password'), 'CorrectHorse123!')
    await user.click(screen.getByRole('button', { name: 'Approve change' }))

    await waitFor(() =>
      expect(approveMutateAsync).toHaveBeenCalledWith({ requestId: 5, currentPassword: 'CorrectHorse123!' }),
    )
    await waitFor(() => expect(toastMessages()).toContain('The change was approved.'))
    await waitFor(() => expect(screen.queryByLabelText('Password')).not.toBeInTheDocument())
  })

  it('reject requires a reason before it can be submitted', async () => {
    vi.mocked(usePendingChangeRequests).mockReturnValue({
      data: { items: [request()], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
      isLoading: false,
      isFetching: false,
    } as unknown as ReturnType<typeof usePendingChangeRequests>)
    const user = userEvent.setup()

    render(<ProfileChangesTab />)
    await user.click(screen.getByRole('button', { name: 'Reject' }))

    expect(screen.getByRole('button', { name: 'Reject change' })).toBeDisabled()

    await user.type(screen.getByLabelText('Reason for rejection'), 'Email already used elsewhere')
    expect(screen.getByRole('button', { name: 'Reject change' })).toBeEnabled()

    rejectMutateAsync.mockResolvedValue(undefined)
    await user.click(screen.getByRole('button', { name: 'Reject change' }))

    await waitFor(() =>
      expect(rejectMutateAsync).toHaveBeenCalledWith({ requestId: 5, reason: 'Email already used elsewhere' }),
    )
    await waitFor(() => expect(toastMessages()).toContain('The change was rejected.'))
  })
})
