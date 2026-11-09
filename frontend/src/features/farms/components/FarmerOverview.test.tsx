import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/config'
import { apiClient } from '@/lib/apiClient'
import type { FarmerOverviewResponse } from '@/types/dto/farmer'
import { FarmerOverview } from './FarmerOverview'

function renderOverview(overview: FarmerOverviewResponse) {
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: overview })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <FarmerOverview />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('FarmerOverview', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('links each count to the page that deals with it, and the latest advice to the advice', async () => {
    renderOverview({
      openIssues: 2,
      activeListings: 3,
      pendingRequests: 1,
      ordersInProgress: 0,
      latestAdvice: {
        advisoryId: 9,
        issueId: 4,
        issueTitle: 'Yellow leaves',
        cropType: 'Tomato',
        reviewedAt: '2026-11-01T00:00:00Z',
      },
    })

    expect(
      await screen.findByRole('link', { name: /2\s*Problems waiting for advice/ }),
    ).toHaveAttribute('href', '/issues/mine')
    expect(screen.getByRole('link', { name: /1\s*New buyer requests/ })).toHaveAttribute(
      'href',
      '/marketplace/requests',
    )
    expect(screen.getByRole('link', { name: /3\s*Active listings/ })).toHaveAttribute(
      'href',
      '/marketplace/mine',
    )
    expect(screen.getByRole('link', { name: /0\s*Orders in progress/ })).toHaveAttribute(
      'href',
      '/orders/mine',
    )
    expect(
      screen.getByRole('link', { name: 'Latest advice: Yellow leaves (Tomato)' }),
    ).toHaveAttribute('href', '/advisories/9')
    expect(apiClient.get).toHaveBeenCalledWith('/api/farmer/overview')
  })

  it('leaves out the advice line when there is no advice yet', async () => {
    renderOverview({
      openIssues: 0,
      activeListings: 0,
      pendingRequests: 0,
      ordersInProgress: 0,
      latestAdvice: null,
    })

    expect(
      await screen.findByRole('link', { name: /Problems waiting for advice/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Latest advice/ })).not.toBeInTheDocument()
  })
})
