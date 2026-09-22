import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import '@/i18n/config'
import i18n from '@/i18n/config'
import { RegisterPage } from './RegisterPage'
import { apiClient } from '@/lib/apiClient'

function axiosErrorWithResponse(status: number, data: unknown): AxiosError {
  const error = new AxiosError('Request failed', String(status))
  error.response = {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  return error
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <RegisterPage />
    </QueryClientProvider>,
  )
}

async function fillCommonFields(
  user: ReturnType<typeof userEvent.setup>,
  overrides: { password?: string; confirmPassword?: string; nic?: string; username?: string } = {},
) {
  const password = overrides.password ?? 'Password@123!'
  const confirmPassword = overrides.confirmPassword ?? password
  await user.type(screen.getByLabelText('Full name'), 'Test Applicant')
  await user.type(screen.getByLabelText('Email'), 'applicant@agrilink.lk')
  await user.type(screen.getByLabelText('Username'), overrides.username ?? 'test.applicant')
  await user.type(screen.getByLabelText('Password'), password)
  await user.type(screen.getByLabelText('Confirm password'), confirmPassword)
  await user.type(screen.getByLabelText('NIC'), overrides.nic ?? '199912345678')
  await screen.findByRole('option', { name: 'Kandy' })
  await user.selectOptions(screen.getByLabelText('District'), 'Kandy')
}

/** Districts for the district picker; `availability` answers the live username check. */
function mockGet(availability: { available: boolean; reason?: string }) {
  return vi.spyOn(apiClient, 'get').mockImplementation((url: string) =>
    Promise.resolve({ data: url.includes('username-available') ? availability : ['Kandy', 'Galle'] }),
  )
}

describe('RegisterPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    mockGet({ available: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to Farmer and shows the farmer-only fields', () => {
    renderPage()

    expect(screen.getByLabelText('Field/plot number')).toBeInTheDocument()
    expect(screen.getByLabelText('Phone number')).toBeInTheDocument()
    expect(screen.queryByLabelText('Legal business name')).not.toBeInTheDocument()
  })

  it('switching to Buyer swaps in the business fields and drops the farmer ones', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Buyer' }))

    expect(screen.getByLabelText('Legal business name')).toBeInTheDocument()
    expect(screen.getByLabelText('Business registration number')).toBeInTheDocument()
    expect(screen.getByLabelText('Business phone')).toBeInTheDocument()
    expect(screen.queryByLabelText('Field/plot number')).not.toBeInTheDocument()
  })

  it('shows the password checklist and updates it live as the password is typed', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('list', { name: 'Password requirements' })).toBeInTheDocument()
    expect(screen.getByText('At least 12 characters').closest('li')).not.toHaveClass('text-state-danger')

    await user.type(screen.getByLabelText('Password'), 'short')
    expect(screen.getByText('At least 12 characters').closest('li')).toHaveClass('text-state-danger')

    await user.type(screen.getByLabelText('Password'), 'Enough123!!!');
    expect(screen.getByText('At least 12 characters').closest('li')).toHaveClass('text-state-success')
  })

  it('submits a Farmer application with the role and farmer fields, and shows the pending confirmation', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { message: 'Waiting for approval', status: 'Pending' },
    })
    const user = userEvent.setup()
    renderPage()

    await fillCommonFields(user)
    await user.type(screen.getByLabelText('Field/plot number'), 'PLOT-42')
    await user.type(screen.getByLabelText('Phone number'), '0771234567')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByText('Application submitted')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({
        role: 'Farmer',
        fieldPlotNumber: 'PLOT-42',
        phoneNumber: '0771234567',
      }),
    )
    // confirmPassword must never be sent to the API.
    expect(post.mock.calls[0]?.[1]).not.toHaveProperty('confirmPassword')
  })

  it('normalizes a spaced phone number and a lowercase NIC suffix before sending', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { message: 'Waiting for approval', status: 'Pending' },
    })
    const user = userEvent.setup()
    renderPage()

    await fillCommonFields(user, { nic: '901234567v' })
    await user.type(screen.getByLabelText('Field/plot number'), 'PLOT-42')
    await user.type(screen.getByLabelText('Phone number'), '077 123 4567')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByText('Application submitted')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({ nic: '901234567V', phoneNumber: '0771234567' }),
    )
  })

  it('requires the business fields before a Buyer application can submit', async () => {
    const post = vi.spyOn(apiClient, 'post')
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Buyer' }))
    await fillCommonFields(user)
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByText('Legal business name is required')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('blocks submission and shows an error when the confirmation does not match the password', async () => {
    const post = vi.spyOn(apiClient, 'post')
    const user = userEvent.setup()
    renderPage()

    await fillCommonFields(user, { password: 'Password@123!', confirmPassword: 'Different@123!' })
    await user.type(screen.getByLabelText('Field/plot number'), 'PLOT-42')
    await user.type(screen.getByLabelText('Phone number'), '0771234567')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('toggles password visibility without changing the typed value', async () => {
    const user = userEvent.setup()
    renderPage()

    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
    await user.type(passwordInput, 'Password@123!')
    expect(passwordInput.type).toBe('password')

    // Both the password and confirm-password fields have their own toggle with the same
    // accessible name, so the first one in document order is this field's own.
    await user.click(screen.getAllByRole('button', { name: 'Show password' })[0])
    expect(passwordInput.type).toBe('text')
    expect(passwordInput.value).toBe('Password@123!')

    await user.click(screen.getAllByRole('button', { name: 'Hide password' })[0])
    expect(passwordInput.type).toBe('password')
  })

  it('shows a field-specific NIC error on blur without submitting', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('NIC'), '90123456V')
    await user.tab()

    expect(await screen.findByText('NIC must be 12 digits, or 9 digits followed by V or X')).toBeInTheDocument()
  })

  it('shows the network-error message in an alert box when the API is unreachable', async () => {
    const networkError = new AxiosError('Network Error')
    networkError.request = {}
    vi.spyOn(apiClient, 'post').mockRejectedValue(networkError)
    const user = userEvent.setup()
    renderPage()

    await fillCommonFields(user)
    await user.type(screen.getByLabelText('Field/plot number'), 'PLOT-42')
    await user.type(screen.getByLabelText('Phone number'), '0771234567')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Can't reach the server. Check your connection and try again.")
  })

  it('shows a 409 conflict as an account-already-exists message', async () => {
    const conflict = axiosErrorWithResponse(409, { message: 'An account with this email already exists.' })
    vi.spyOn(apiClient, 'post').mockRejectedValue(conflict)
    const user = userEvent.setup()
    renderPage()

    await fillCommonFields(user)
    await user.type(screen.getByLabelText('Field/plot number'), 'PLOT-42')
    await user.type(screen.getByLabelText('Phone number'), '0771234567')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('An account with this email already exists.')
  })

  describe('username', () => {
    async function fillFarmerApplication(user: ReturnType<typeof userEvent.setup>, username?: string) {
      await fillCommonFields(user, { username })
      await user.type(screen.getByLabelText('Field/plot number'), 'PLOT-42')
      await user.type(screen.getByLabelText('Phone number'), '0771234567')
    }

    it('is required', async () => {
      const post = vi.spyOn(apiClient, 'post')
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByLabelText('Username'))
      await user.tab()

      expect(await screen.findByText('Username must be at least 3 characters')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Register' }))
      expect(post).not.toHaveBeenCalled()
    })

    it('rejects a badly formed username before asking the server', async () => {
      const get = mockGet({ available: true })
      const user = userEvent.setup()
      renderPage()

      await user.type(screen.getByLabelText('Username'), 'bad..name')
      await user.tab()

      expect(
        await screen.findByText(/Use lowercase letters, numbers, dots and underscores/),
      ).toBeInTheDocument()
      expect(get.mock.calls.some(([url]) => String(url).includes('username-available'))).toBe(false)
    })

    it('shows a live "available" result once typing pauses, with the username as a query param', async () => {
      const get = mockGet({ available: true })
      const user = userEvent.setup()
      renderPage()

      await user.type(screen.getByLabelText('Username'), 'Nimal.Perera')

      expect(await screen.findByText('Username is available')).toBeInTheDocument()
      const call = get.mock.calls.find(([url]) => String(url).includes('username-available'))
      // Normalized, and passed as axios params so it is encoded rather than concatenated into the URL.
      expect(call?.[0]).toBe('/api/users/username-available')
      expect(call?.[1]).toEqual(expect.objectContaining({ params: { username: 'nimal.perera' } }))
    })

    it('shows "taken" and blocks submission when the username is in use', async () => {
      mockGet({ available: false, reason: 'taken' })
      const post = vi.spyOn(apiClient, 'post')
      const user = userEvent.setup()
      renderPage()

      await fillFarmerApplication(user, 'nimal.perera')
      expect(await screen.findByText('That username is taken')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Register' }))

      expect(await screen.findByText('That username is taken.')).toBeInTheDocument()
      expect(post).not.toHaveBeenCalled()
    })

    it('sends the username trimmed and lowercased', async () => {
      const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
        data: { message: 'Waiting for approval', status: 'Pending' },
      })
      const user = userEvent.setup()
      renderPage()

      await fillFarmerApplication(user, 'Nimal.Perera')
      await user.click(screen.getByRole('button', { name: 'Register' }))

      expect(await screen.findByText('Application submitted')).toBeInTheDocument()
      expect(post).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({ username: 'nimal.perera', email: 'applicant@agrilink.lk' }),
      )
    })

    it('shows the server\'s 409 username clash as "username taken", not "email exists"', async () => {
      vi.spyOn(apiClient, 'post').mockRejectedValue(
        axiosErrorWithResponse(409, {
          errors: [{ code: 'DuplicateUserName', description: 'That username is taken.' }],
        }),
      )
      const user = userEvent.setup()
      renderPage()

      await fillFarmerApplication(user)
      await user.click(screen.getByRole('button', { name: 'Register' }))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('That username is taken.')
      expect(alert).not.toHaveTextContent('email')
    })
  })
})
