import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import '@/i18n/config'
import i18n from '@/i18n/config'
import { LoginPage } from './LoginPage'
import { useAuthStore } from './authStore'
import { apiClient } from '@/lib/apiClient'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function failWith(response?: { status: number; data?: unknown }) {
  vi.spyOn(apiClient, 'post').mockRejectedValue(
    Object.assign(new Error('Request failed'), { isAxiosError: true, response }),
  )
}

async function signIn() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), 'farmer@agrilink.lk')
  await user.type(screen.getByLabelText('Password'), 'Farmer@AgriLink.2026!')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('LoginPage', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('en')
    useAuthStore.setState({ token: null, role: null, user: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('says an application is still waiting for approval, not that the password is wrong', async () => {
    failWith({ status: 403, data: { message: 'Your account is waiting for approval.' } })

    renderPage()
    await signIn()

    expect(await screen.findByText(/waiting for approval/)).toBeInTheDocument()
    expect(screen.queryByText('Invalid email or password.')).not.toBeInTheDocument()
  })

  it("shows a rejected application's reason", async () => {
    failWith({
      status: 403,
      data: { message: 'Your registration was not approved.', reason: 'Plot number could not be verified' },
    })

    renderPage()
    await signIn()

    expect(await screen.findByText('Your registration was not approved.')).toBeInTheDocument()
    expect(screen.getByText('Reason: Plot number could not be verified')).toBeInTheDocument()
  })

  it('keeps the credential message for a 401', async () => {
    failWith({ status: 401, data: { message: 'Invalid email or password.' } })

    renderPage()
    await signIn()

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument()
  })

  it('says the server could not be reached when there is no response', async () => {
    failWith(undefined)

    renderPage()
    await signIn()

    expect(await screen.findByText(/Can't reach the server/)).toBeInTheDocument()
  })

  it('shows a generic error for a server failure', async () => {
    failWith({ status: 500 })

    renderPage()
    await signIn()

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument()
  })
})
