import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from '@/i18n/config'
import { apiClient } from '@/lib/apiClient'
import type { SmsAlertSettings } from '../api/smsAlertsApi'
import { SmsAlertsSetting } from './SmsAlertsSetting'

function settings(overrides: Partial<SmsAlertSettings> = {}): SmsAlertSettings {
  return {
    available: true,
    enabled: false,
    language: 'en',
    phoneNumber: '0771234567',
    phoneCanReceiveSms: true,
    ...overrides,
  }
}

function renderSetting() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <SmsAlertsSetting />
    </QueryClientProvider>,
  )
}

describe('SmsAlertsSetting', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stays hidden while the server has no SMS gateway', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: settings({ available: false }) })
    const { container } = renderSetting()

    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('turns alerts on and then offers the SMS language', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: settings() })
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: settings({ enabled: true }) })
    const user = userEvent.setup()
    renderSetting()

    expect(await screen.findByText(/0771234567/)).toBeInTheDocument()
    expect(screen.queryByText('SMS language')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'On' }))

    expect(put).toHaveBeenCalledWith('/api/users/me/sms-alerts', { enabled: true })
    expect(await screen.findByText('SMS language')).toBeInTheDocument()
  })

  it('saves a new SMS language', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: settings({ enabled: true }) })
    const put = vi
      .spyOn(apiClient, 'put')
      .mockResolvedValue({ data: settings({ enabled: true, language: 'ta' }) })
    const user = userEvent.setup()
    renderSetting()

    await user.click(await screen.findByRole('button', { name: 'தமிழ்' }))

    expect(put).toHaveBeenCalledWith('/api/users/me/sms-alerts', { language: 'ta' })
  })

  it('asks for a mobile number instead of offering On when there is none', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: settings({ phoneNumber: '0812345678', phoneCanReceiveSms: false }),
    })
    renderSetting()

    expect(await screen.findByText(/mobile number starting with 07/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'On' })).not.toBeInTheDocument()
  })
})
