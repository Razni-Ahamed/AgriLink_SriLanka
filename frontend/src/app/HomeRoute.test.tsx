import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/config'
import { useAuthStore } from '@/auth/authStore'
import { apiClient } from '@/lib/apiClient'
import type { HarvestListingResponse } from '@/types/dto/harvests'
import { HomeRoute } from './HomeRoute'

function harvest(harvestId: number, cropType: string): HarvestListingResponse {
  return {
    harvestId,
    cropType,
    district: 'Kandy',
    harvestDate: '2026-09-01',
    pricePerUnit: 120,
    availableQuantity: 50,
    status: 'Active',
  } as HarvestListingResponse
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <HomeRoute /> },
      { path: '/farms', element: <p>Farms page</p> },
    ],
    { initialEntries: [path] },
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('HomeRoute', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    useAuthStore.setState({ token: null, role: null, user: null })
  })

  it('shows a visitor the landing page with the latest harvests', async () => {
    useAuthStore.setState({ token: null, role: null, isHydrated: true })
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({
        data: Array.from({ length: 8 }, (_, i) => harvest(i + 1, i === 0 ? 'Tomato' : 'Paddy')),
      })

    renderAt('/')

    expect(
      screen.getByRole('heading', { name: 'From the field to the market, all in one place' }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Tomato' })).toBeInTheDocument()
    // Only a preview: the full list is one click away on the marketplace page.
    expect(screen.getAllByRole('heading', { level: 3, name: /Tomato|Paddy/ })).toHaveLength(6)
    expect(get).toHaveBeenCalledWith('/api/harvests', expect.anything())
    expect(screen.getByRole('link', { name: 'Register as a buyer' })).toHaveAttribute(
      'href',
      '/register?role=Buyer',
    )
  })

  it('sends a signed-in user straight to their role home', () => {
    useAuthStore.setState({ token: 'jwt', role: 'Farmer', isHydrated: true })

    renderAt('/')

    expect(screen.getByText('Farms page')).toBeInTheDocument()
  })

  it('renders nothing until the stored session has been read', () => {
    useAuthStore.setState({ token: null, role: null, isHydrated: false })

    renderAt('/')

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })
})
