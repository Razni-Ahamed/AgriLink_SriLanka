import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import i18n from '@/i18n/config'
import type { UserProfileResponse } from '@/auth/api'
import { useAuthStore } from '@/auth/authStore'
import { apiClient } from '@/lib/apiClient'
import { useUiStore } from '@/lib/useUiStore'
import { farmerProfile } from '@/test/profileFixtures'
import { GeneralSettingsTab } from './GeneralSettingsTab'

function renderTab(user: UserProfileResponse = farmerProfile()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <GeneralSettingsTab user={user} />
    </QueryClientProvider>,
  )
}

/** GET answers: the live username check, and the profile re-read after a save. */
function mockGet(availability: { available: boolean; reason?: string } = { available: true }) {
  return vi.spyOn(apiClient, 'get').mockImplementation((url: string) =>
    Promise.resolve({ data: url.includes('username-available') ? availability : farmerProfile() }),
  )
}

function conflict(): AxiosError {
  const error = new AxiosError('Request failed', '409')
  error.response = {
    status: 409,
    data: { errors: [{ code: 'DuplicateUserName', description: 'That username is taken.' }] },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  return error
}

const toastMessages = () => useUiStore.getState().toasts.map((toast) => toast.message)

async function startEditing(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Edit profile' }))
}

describe('GeneralSettingsTab', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    useAuthStore.setState({ token: 'jwt', role: 'Farmer', user: farmerProfile(), isHydrated: true })
    useUiStore.setState({ toasts: [] })
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useAuthStore.setState({ token: null, role: null, user: null })
  })

  it('starts read-only, with a single Edit profile button', () => {
    renderTab()

    expect(screen.getByText('PLOT-42')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument()
  })

  it('Edit profile turns only the editable fields into inputs; Cancel discards and returns', async () => {
    mockGet()
    const put = vi.spyOn(apiClient, 'put')
    const user = userEvent.setup()
    renderTab()

    await startEditing(user)

    expect(screen.getByLabelText('Display name')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Field/plot number')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('NIC')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Business name')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Display name'), 'Something')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
  })

  it('shows the current values as placeholders, and leaving every field empty changes nothing', async () => {
    mockGet()
    const put = vi.spyOn(apiClient, 'put')
    const user = userEvent.setup()
    renderTab(farmerProfile({ displayName: 'Nimal' }))
    await startEditing(user)

    expect(screen.getByLabelText('Display name')).toHaveAttribute('placeholder', 'Nimal')
    expect(screen.getByLabelText('Username')).toHaveAttribute('placeholder', 'nimal.perera')
    expect(screen.getByLabelText('Field/plot number')).toHaveAttribute('placeholder', 'PLOT-42')

    await user.click(screen.getByRole('button', { name: 'Update profile' }))

    expect(put).not.toHaveBeenCalled()
    expect(toastMessages()).toContain('There were no changes to save.')
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument()
  })

  it('sends only the fields that changed, then refreshes the signed-in user', async () => {
    const get = mockGet()
    const updated = farmerProfile({ displayName: 'Nimal P.' })
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: updated })
    const user = userEvent.setup()
    renderTab()
    await startEditing(user)

    await user.type(screen.getByLabelText('Display name'), '  Nimal P.  ')
    // Typing the current value back is not a change either.
    await user.type(screen.getByLabelText('Field/plot number'), 'PLOT-42')
    await user.click(screen.getByRole('button', { name: 'Update profile' }))

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(put).toHaveBeenCalledWith('/api/users/me/profile', { displayName: 'Nimal P.' })
    await waitFor(() => expect(get).toHaveBeenCalledWith('/api/users/me'))
    expect(useAuthStore.getState().user?.displayName).toBeNull() // the re-read profile wins
    expect(toastMessages()).toContain('Your profile has been updated.')
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument()
  })

  it('"Use my full name instead" clears the display name', async () => {
    mockGet()
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: farmerProfile() })
    const user = userEvent.setup()
    renderTab(farmerProfile({ displayName: 'Nimal' }))
    await startEditing(user)

    await user.click(screen.getByRole('button', { name: 'Use my full name instead' }))
    await user.click(screen.getByRole('button', { name: 'Update profile' }))

    await waitFor(() => expect(put).toHaveBeenCalledWith('/api/users/me/profile', { displayName: '' }))
  })

  it('shows the live username check, and does not check the user\'s own username', async () => {
    const get = mockGet({ available: true })
    const user = userEvent.setup()
    renderTab()
    await startEditing(user)

    await user.type(screen.getByLabelText('Username'), 'Nimal.Perera')
    expect(screen.getByText(/3–30 characters/)).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Username'))
    await user.type(screen.getByLabelText('Username'), 'nimal.p')
    expect(await screen.findByText('Username is available')).toBeInTheDocument()

    const checked = get.mock.calls
      .filter(([url]) => String(url).includes('username-available'))
      .map(([, config]) => (config as { params: { username: string } }).params.username)
    expect(checked).toEqual(['nimal.p'])
  })

  it('shows "taken" and refuses to submit a taken username', async () => {
    mockGet({ available: false, reason: 'taken' })
    const put = vi.spyOn(apiClient, 'put')
    const user = userEvent.setup()
    renderTab()
    await startEditing(user)

    await user.type(screen.getByLabelText('Username'), 'kumari.silva')
    expect(await screen.findByText('That username is taken')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Update profile' }))

    expect(await screen.findByText('That username is taken.')).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
  })

  it('flags a malformed username under the field', async () => {
    mockGet()
    const user = userEvent.setup()
    renderTab()
    await startEditing(user)

    await user.type(screen.getByLabelText('Username'), 'bad..name')
    await user.tab()

    expect(await screen.findByText(/Use lowercase letters, numbers, dots and underscores/)).toBeInTheDocument()
  })

  it('disables the username until the 30 days are up, and says when', async () => {
    mockGet()
    const user = userEvent.setup()
    renderTab(farmerProfile({ usernameChangeAvailableAt: '2099-03-01T00:00:00Z' }))
    await startEditing(user)

    expect(screen.getByLabelText('Username')).toBeDisabled()
    expect(screen.getByText(/You can change your username again on .*2099/)).toBeInTheDocument()
  })

  it('shows the server\'s username clash as an error toast and stays in edit mode', async () => {
    mockGet()
    vi.spyOn(apiClient, 'put').mockRejectedValue(conflict())
    const user = userEvent.setup()
    renderTab()
    await startEditing(user)

    await user.type(screen.getByLabelText('Username'), 'nimal.p')
    await screen.findByText('Username is available')
    await user.click(screen.getByRole('button', { name: 'Update profile' }))

    await waitFor(() => expect(toastMessages()).toContain('That username is taken.'))
    expect(screen.getByRole('button', { name: 'Update profile' })).toBeInTheDocument()
  })

  it('previews a chosen photo and uploads it only on Update profile', async () => {
    mockGet()
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: farmerProfile() })
    const user = userEvent.setup()
    renderTab()
    await startEditing(user)

    const file = new File([new Uint8Array(1024)], 'me.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Profile photo'), file)

    expect(screen.getByRole('img', { name: 'Nimal Perera' })).toHaveAttribute('src', 'blob:preview')
    expect(screen.getByText('New photo — saved when you choose Update profile.')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Update profile' }))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    const [url, body] = post.mock.calls[0]
    expect(url).toBe('/api/users/me/photo')
    expect((body as FormData).get('photo')).toBe(file)
  })

  it('refuses a photo that is not JPEG, PNG or WebP, or is over 5 MB', async () => {
    mockGet()
    const user = userEvent.setup({ applyAccept: false })
    renderTab()
    await startEditing(user)

    await user.upload(screen.getByLabelText('Profile photo'), new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a JPEG, PNG or WebP image.')

    const huge = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('Profile photo'), huge)
    expect(await screen.findByRole('alert')).toHaveTextContent('The photo is larger than 5 MB.')
  })

  it('removes an existing photo on Update profile', async () => {
    mockGet()
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: farmerProfile() })
    const user = userEvent.setup()
    renderTab(farmerProfile({ profilePhotoUrl: 'https://res.cloudinary.com/demo/image/upload/a.jpg' }))
    await startEditing(user)

    await user.click(screen.getByRole('button', { name: 'Remove photo' }))
    expect(screen.getByText('Your photo will be removed when you choose Update profile.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Update profile' }))

    await waitFor(() => expect(remove).toHaveBeenCalledWith('/api/users/me/photo'))
  })

  it('offers a buyer the business name instead of the field/plot number', async () => {
    mockGet()
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: farmerProfile() })
    const user = userEvent.setup()
    renderTab(farmerProfile({ role: 'Buyer', fieldPlotNumber: null, businessName: 'Silva Traders' }))
    await startEditing(user)

    expect(screen.queryByLabelText('Field/plot number')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Business name'), 'Silva & Sons')
    await user.click(screen.getByRole('button', { name: 'Update profile' }))

    await waitFor(() => expect(put).toHaveBeenCalledWith('/api/users/me/profile', { businessName: 'Silva & Sons' }))
  })

  it('offers an officer neither role field', async () => {
    mockGet()
    const user = userEvent.setup()
    renderTab(farmerProfile({ role: 'Officer', fieldPlotNumber: null, departmentName: 'Extension' }))
    await startEditing(user)

    expect(screen.queryByLabelText('Field/plot number')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Business name')).not.toBeInTheDocument()
  })
})
