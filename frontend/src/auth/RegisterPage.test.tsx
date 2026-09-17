import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/i18n/config'
import i18n from '@/i18n/config'
import { RegisterPage } from './RegisterPage'
import { apiClient } from '@/lib/apiClient'

function renderPage() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <RegisterPage />
    </QueryClientProvider>,
  )
}

async function fillCommonFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name'), 'Test Applicant')
  await user.type(screen.getByLabelText('Email'), 'applicant@agrilink.lk')
  await user.type(screen.getByLabelText('Password'), 'Password@123!')
  await user.type(screen.getByLabelText('NIC'), '199912345678')
  await screen.findByRole('option', { name: 'Kandy' })
  await user.selectOptions(screen.getByLabelText('District'), 'Kandy')
}

describe('RegisterPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: ['Kandy', 'Galle'] })
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
})
