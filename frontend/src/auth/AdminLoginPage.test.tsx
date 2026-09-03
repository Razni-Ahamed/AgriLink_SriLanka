import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import '@/i18n/config'
import i18n from '@/i18n/config'
import { AdminLoginPage } from './AdminLoginPage'
import { useAuthStore } from './authStore'
import { apiClient } from '@/lib/apiClient'

const navigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function submit(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign in as Admin' }))
}

describe('AdminLoginPage', () => {
  beforeEach(async () => {
    localStorage.clear()
    navigate.mockClear()
    await i18n.changeLanguage('en')
    useAuthStore.setState({ token: null, role: null, user: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('posts to the admin endpoint and lands on the dashboard', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: { token: 'admin-token', role: 'Admin' } })

    renderPage()
    await submit('admin@agrilink.lk', 'test-admin-password')

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/admin', { replace: true }))
    expect(post).toHaveBeenCalledWith('/api/auth/admin/login', {
      email: 'admin@agrilink.lk',
      password: 'test-admin-password',
    })
    expect(useAuthStore.getState().role).toBe('Admin')
  })

  it('explains a 403 as missing admin access rather than a bad password', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(
      Object.assign(new Error('Forbidden'), {
        isAxiosError: true,
        response: { status: 403 },
      }),
    )

    renderPage()
    await submit('farmer@example.com', 'Farmer@2026x')

    expect(
      await screen.findByText('This account does not have administrator access.'),
    ).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('shows a credential error on 401', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(
      Object.assign(new Error('Unauthorized'), {
        isAxiosError: true,
        response: { status: 401 },
      }),
    )

    renderPage()
    await submit('admin@agrilink.lk', 'wrong-password')

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument()
  })

  it('renders in the selected language', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'සිංහල' }))

    expect(screen.getByText('පරිපාලක කොන්සෝලය')).toBeInTheDocument()
  })
})
