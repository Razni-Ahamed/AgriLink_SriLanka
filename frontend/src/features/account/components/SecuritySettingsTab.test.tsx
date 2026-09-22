import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import i18n from '@/i18n/config'
import { useAuthStore } from '@/auth/authStore'
import { useUiStore } from '@/lib/useUiStore'
import { farmerProfile, securitySettings } from '@/test/profileFixtures'
import { SecuritySettingsTab } from './SecuritySettingsTab'

vi.mock('../api/securityApi', async () => {
  const actual = await vi.importActual<typeof import('../api/securityApi')>('../api/securityApi')
  return {
    ...actual,
    getSecuritySettings: vi.fn(),
    verifyPassword: vi.fn(),
    updatePhone: vi.fn(),
    createChangeRequest: vi.fn(),
    withdrawChangeRequest: vi.fn(),
  }
})
import {
  createChangeRequest,
  getSecuritySettings,
  updatePhone,
  verifyPassword,
  withdrawChangeRequest,
} from '../api/securityApi'

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <SecuritySettingsTab />
    </QueryClientProvider>,
  )
}

/** A 400 with no body — parseApiError falls through to the generic-key fallback. */
function badRequest(): AxiosError {
  const error = new AxiosError('Request failed', '400')
  error.response = { status: 400, data: undefined, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } }
  return error
}

const toastMessages = () => useUiStore.getState().toasts.map((toast) => toast.message)

async function unlock(user: ReturnType<typeof userEvent.setup>, password = 'CorrectHorse123!') {
  await user.click(screen.getByRole('button', { name: 'Edit security details' }))
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Unlock' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Done editing' })).toBeInTheDocument())
}

describe('SecuritySettingsTab', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    useAuthStore.setState({ token: 'jwt', role: 'Farmer', user: farmerProfile(), isHydrated: true })
    useUiStore.setState({ toasts: [] })
    vi.mocked(getSecuritySettings).mockResolvedValue(securitySettings())
    vi.mocked(verifyPassword).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useAuthStore.setState({ token: null, role: null, user: null })
  })

  it('shows a Farmer only the fields the role matrix allows, all needing approval except phone', async () => {
    renderTab()

    await waitFor(() => expect(screen.getByText('••••••••')).toBeInTheDocument())
    expect(screen.getByText('Phone number')).toBeInTheDocument()
    expect(screen.getByText('Full name')).toBeInTheDocument()
    expect(screen.getByText('NIC')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('shows an Officer full name and email but no NIC field', async () => {
    useAuthStore.setState({ role: 'Officer' })
    vi.mocked(getSecuritySettings).mockResolvedValue(
      securitySettings({ canChange: ['password', 'phone'], canRequest: ['fullName', 'email'], nic: undefined }),
    )
    renderTab()

    await waitFor(() => expect(screen.getByText('••••••••')).toBeInTheDocument())
    expect(screen.getByText('Full name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.queryByText('NIC')).not.toBeInTheDocument()
  })

  it('shows an Admin every field as a direct change, with no approval note once unlocked', async () => {
    useAuthStore.setState({ role: 'Admin' })
    vi.mocked(getSecuritySettings).mockResolvedValue(
      securitySettings({ canChange: ['password', 'phone', 'fullName', 'email'], canRequest: [], nic: undefined }),
    )
    const user = userEvent.setup()
    renderTab()
    await waitFor(() => expect(screen.getByText('••••••••')).toBeInTheDocument())
    expect(screen.queryByText('NIC')).not.toBeInTheDocument()

    await unlock(user)

    expect(screen.getAllByRole('button', { name: 'Save' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Submit for approval' })).not.toBeInTheDocument()
  })

  it('shows an inline error on the wrong password and stays locked', async () => {
    vi.mocked(verifyPassword).mockRejectedValue(badRequest())
    const user = userEvent.setup()
    renderTab()
    await waitFor(() => expect(screen.getByText('••••••••')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Edit security details' }))
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Unlock' }))

    expect(await screen.findByText('Current password is incorrect.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Done editing' })).not.toBeInTheDocument()
  })

  it('unlocks on the correct password, revealing the editable fields and the password panel', async () => {
    const user = userEvent.setup()
    renderTab()
    await waitFor(() => expect(screen.getByText('••••••••')).toBeInTheDocument())

    await unlock(user)

    expect(screen.getByLabelText('Current password')).toBeInTheDocument() // ChangePasswordPanel
    expect(screen.getAllByLabelText(/New Phone number|New Full name|New Email/).length).toBeGreaterThan(0)
  })

  it('clears the unlock password on Cancel, so reopening starts empty', async () => {
    const user = userEvent.setup()
    renderTab()
    await waitFor(() => expect(screen.getByText('••••••••')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Edit security details' }))
    await user.type(screen.getByLabelText('Password'), 'something-typed')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    await user.click(screen.getByRole('button', { name: 'Edit security details' }))
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  it('re-locks on Done editing, hiding the editable fields again', async () => {
    const user = userEvent.setup()
    renderTab()
    await waitFor(() => expect(screen.getByText('••••••••')).toBeInTheDocument())
    await unlock(user)

    await user.click(screen.getByRole('button', { name: 'Done editing' }))

    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit security details' })).toBeInTheDocument()
  })

  it('auto-locks after 5 minutes without an edit', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ delay: null })
    renderTab()
    await waitFor(() => expect(screen.getByText('••••••••')).toBeInTheDocument())
    await unlock(user)

    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit security details' })).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('leaving a field empty keeps the current value instead of submitting', async () => {
    const user = userEvent.setup()
    renderTab()
    await waitFor(() => expect(screen.getByText('••••••••')).toBeInTheDocument())
    await unlock(user)

    await user.click(screen.getAllByRole('button', { name: 'Submit for approval' })[0])

    expect(createChangeRequest).not.toHaveBeenCalled()
  })

  it('sends only the changed field, with the re-authenticated password, on submit', async () => {
    vi.mocked(createChangeRequest).mockResolvedValue({
      kind: 'requested',
      request: {
        requestId: 1,
        field: 'FullName',
        oldValue: 'Nimal Perera',
        newValue: 'Nimal P. Silva',
        status: 'Pending',
        requestedAt: '2026-09-22T00:00:00Z',
      },
    })
    const user = userEvent.setup()
    renderTab()
    await waitFor(() => expect(screen.getByText('••••••••')).toBeInTheDocument())
    await unlock(user, 'CorrectHorse123!')

    await user.type(screen.getByLabelText('New Full name'), 'Nimal P. Silva')
    await user.click(screen.getAllByRole('button', { name: 'Submit for approval' })[0])

    await waitFor(() =>
      expect(createChangeRequest).toHaveBeenCalledWith(
        { currentPassword: 'CorrectHorse123!', field: 'FullName', newValue: 'Nimal P. Silva' },
        false,
      ),
    )
    await waitFor(() => expect(toastMessages()).toContain('Your request was submitted for approval.'))
  })

  it('saves a direct field (phone) immediately, without approval wording', async () => {
    vi.mocked(updatePhone).mockResolvedValue(farmerProfile({ phoneNumber: '0779998888' }))
    const user = userEvent.setup()
    renderTab()
    await waitFor(() => expect(screen.getByText('••••••••')).toBeInTheDocument())
    await unlock(user, 'CorrectHorse123!')

    await user.type(screen.getByLabelText('New Phone number'), '0779998888')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(updatePhone).toHaveBeenCalledWith({ currentPassword: 'CorrectHorse123!', phoneNumber: '0779998888' }),
    )
    await waitFor(() => expect(toastMessages()).toContain('Your phone number was updated.'))
  })

  it('shows a pending badge with the requested value, and withdraws it', async () => {
    vi.mocked(getSecuritySettings).mockResolvedValue(
      securitySettings({
        changeRequests: [
          {
            requestId: 9,
            field: 'Email',
            oldValue: 'nimal@agrilink.lk',
            newValue: 'nimal.new@agrilink.lk',
            status: 'Pending',
            requestedAt: '2026-09-20T00:00:00Z',
          },
        ],
      }),
    )
    vi.mocked(withdrawChangeRequest).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderTab()

    await waitFor(() => expect(screen.getByText('••••••••')).toBeInTheDocument())
    expect(screen.getByText('Pending approval')).toBeInTheDocument()
    expect(screen.getByText('Requested: nimal.new@agrilink.lk')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Withdraw' }))

    await waitFor(() => expect(withdrawChangeRequest).toHaveBeenCalledWith(9))
    await waitFor(() => expect(toastMessages()).toContain('Your request was withdrawn.'))
  })

  it('forgets the unlocked password when the component unmounts (pop-up close / tab switch)', async () => {
    const user = userEvent.setup()
    const { unmount } = renderTab()
    await waitFor(() => expect(screen.getByText('••••••••')).toBeInTheDocument())
    await unlock(user)
    expect(screen.getByLabelText('Current password')).toBeInTheDocument()

    unmount()

    // Remounting is a fresh component instance — nothing survives the unmount to skip re-auth.
    renderTab()
    await waitFor(() => expect(screen.getByText('••••••••')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Edit security details' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument()
  })
})
