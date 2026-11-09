import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from '@/i18n/config'
import type { PurchaseRequestResponse, PurchaseRequestStatus } from '@/types/dto/purchaseRequests'
import { PurchaseRequestCard } from './PurchaseRequestCard'

let role = 'Farmer'
vi.mock('@/auth/authStore', () => ({
  useAuthStore: <T,>(selector: (state: { role: string }) => T) => selector({ role }),
}))
// The real client checks VITE_API_BASE_URL at import, which CI doesn't set.
vi.mock('@/lib/apiClient', () => ({ apiClient: {} }))

function renderCard(status: PurchaseRequestStatus, onWithdraw?: () => void) {
  const request: PurchaseRequestResponse = {
    requestId: 4,
    harvestId: 1,
    buyerProfileId: 1,
    requestedQuantity: 50,
    message: '',
    status,
    createdAt: '2026-10-01T10:00:00Z',
    cropType: 'Tomato',
    district: 'Kandy',
    pricePerUnit: 120,
    unit: 'Kg',
    buyerName: 'Kamala',
    buyerBusinessName: 'Kamala Stores',
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <PurchaseRequestCard request={request} onWithdraw={onWithdraw} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PurchaseRequestCard chat button', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    role = 'Farmer'
  })

  it.each(['Pending', 'Accepted'] as const)(
    'lets the farmer message the buyer about a %s request',
    (status) => {
      renderCard(status)

      expect(screen.getByRole('button', { name: 'Message the buyer' })).toBeInTheDocument()
    },
  )

  it('lets the buyer message the farmer', () => {
    role = 'Buyer'
    renderCard('Pending')

    expect(screen.getByRole('button', { name: 'Message the farmer' })).toBeInTheDocument()
  })

  it.each(['Declined', 'Cancelled'] as const)(
    'offers no new chat once a request is %s',
    (status) => {
      renderCard(status)

      expect(screen.queryByRole('button', { name: /Message the/ })).not.toBeInTheDocument()
    },
  )
})

describe('PurchaseRequestCard quantity and withdraw', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    role = 'Buyer'
  })

  it('shows the quantity and price in the listing unit', () => {
    renderCard('Pending')

    expect(screen.getByText('50 kg requested')).toBeInTheDocument()
    expect(screen.getByText(/Rs 120\/kg/)).toBeInTheDocument()
  })

  it('lets the buyer withdraw a pending request', async () => {
    const onWithdraw = vi.fn()
    renderCard('Pending', onWithdraw)

    await userEvent.click(screen.getByRole('button', { name: 'Withdraw request' }))

    expect(onWithdraw).toHaveBeenCalledOnce()
  })

  it.each(['Accepted', 'Declined', 'Withdrawn'] as const)(
    'offers no withdraw once a request is %s',
    (status) => {
      renderCard(status, vi.fn())

      expect(screen.queryByRole('button', { name: 'Withdraw request' })).not.toBeInTheDocument()
    },
  )

  it('labels a withdrawn request', () => {
    renderCard('Withdrawn')

    expect(screen.getByText('Withdrawn')).toBeInTheDocument()
  })
})
