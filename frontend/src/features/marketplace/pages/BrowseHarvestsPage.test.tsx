import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/config'
import { apiClient } from '@/lib/apiClient'
import type { HarvestListingResponse } from '@/types/dto/harvests'
import { BrowseHarvestsPage } from './BrowseHarvestsPage'

function listing(harvestId: number, cropType: string): HarvestListingResponse {
  return {
    harvestId,
    farmerProfileId: 1,
    cropId: harvestId,
    cropType,
    variety: 'Local',
    quantity: 40,
    availableQuantity: 25,
    harvestDate: '2026-11-01',
    pricePerUnit: 120,
    unit: 'Kg',
    location: 'Kandy',
    district: 'Kandy',
    status: 'Active',
    createdAt: '2026-11-01T08:00:00Z',
  }
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BrowseHarvestsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('BrowseHarvestsPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('asks the API for one page at a time and pages through the rest', async () => {
    const get = vi.spyOn(apiClient, 'get').mockImplementation(async (url, config) => {
      // The filter bar's district and crop pickers load their lists too.
      if (url !== '/api/harvests') return { data: [] }
      const page = (config?.params as { page: number }).page
      return {
        data: {
          items: [listing(page, page === 1 ? 'Tomato' : 'Carrot')],
          page,
          pageSize: 24,
          totalCount: 30,
          totalPages: 2,
        },
      }
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Tomato' })).toBeInTheDocument()
    expect(screen.getByText('Showing 1 of 30')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith(
      '/api/harvests',
      expect.objectContaining({ params: expect.objectContaining({ page: 1, pageSize: 24 }) }),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(await screen.findByRole('heading', { name: 'Carrot' })).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
  })

  it('sends the chosen crop group to the API and starts again from page 1', async () => {
    const get = vi.spyOn(apiClient, 'get').mockImplementation(async (url) => ({
      data:
        url === '/api/harvests'
          ? { items: [], page: 1, pageSize: 24, totalCount: 0, totalPages: 0 }
          : [],
    }))

    renderPage()
    await waitFor(() => expect(get).toHaveBeenCalled())

    await userEvent.click(screen.getByRole('button', { name: 'Plantation & export' }))

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(
        '/api/harvests',
        expect.objectContaining({
          params: expect.objectContaining({
            page: 1,
            cropTypes: expect.stringMatching(/^Tea,Rubber/),
          }),
        }),
      ),
    )
  })
})
