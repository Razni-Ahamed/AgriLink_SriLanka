import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import i18n from '@/i18n/config'
import { useAuthStore } from '@/auth/authStore'
import { farmerProfile } from '@/test/profileFixtures'
import { AppLayout } from './AppLayout'
import { pageRoutes } from './pageRoutes'

// Stand-in pages: these tests are about the layout and the pop-up's routes, not any real page.
// (The factory is hoisted above the imports, so it builds elements with its own React import.)
vi.mock('./pageRoutes', async () => {
  const { createElement } = await import('react')
  const page = (text: string) => createElement('p', null, text)
  return {
    pageRoutes: [
      { path: '/', element: page('Home redirect') },
      { path: '/farms', element: page('Farms page') },
      { path: '/orders/mine', element: page('Orders page') },
      { path: '/profile', element: null },
      { path: '/profile/security', element: null },
    ],
  }
})
vi.mock('@/features/orders/components/NotificationBell', () => ({ NotificationBell: () => null }))

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <p>Login page</p> },
      { element: <AppLayout />, children: pageRoutes },
    ],
    { initialEntries: [path] },
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('AppLayout profile pop-up', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    useAuthStore.setState({ token: 'jwt', role: 'Farmer', user: farmerProfile(), isHydrated: true })
  })

  afterEach(() => {
    useAuthStore.setState({ token: null, role: null, user: null })
  })

  it('opens from the header menu over the current page, and closing returns to that page', async () => {
    const user = userEvent.setup()
    const router = renderAt('/orders/mine')

    await user.click(screen.getByRole('button', { name: /Account menu/ }))
    await user.click(screen.getByRole('menuitem', { name: 'My profile' }))

    expect(await screen.findByRole('dialog', { name: 'My profile' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/profile')
    expect(screen.getByText('Orders page')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(router.state.location.pathname).toBe('/orders/mine')
    expect(screen.getByText('Orders page')).toBeInTheDocument()
  })

  it('switching tabs changes the address without adding history, so one Back leaves the pop-up', async () => {
    const user = userEvent.setup()
    const router = renderAt('/orders/mine')
    await user.click(screen.getByRole('button', { name: /Account menu/ }))
    await user.click(screen.getByRole('menuitem', { name: 'My profile' }))

    await user.click(await screen.findByRole('tab', { name: 'Security settings' }))
    expect(router.state.location.pathname).toBe('/profile/security')

    await router.navigate(-1)
    expect(router.state.location.pathname).toBe('/orders/mine')
  })

  it('opens directly at /profile/security over the home page, and closing goes to /', async () => {
    const user = userEvent.setup()
    const router = renderAt('/profile/security')

    expect(await screen.findByRole('dialog', { name: 'My profile' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Security settings' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Farms page')).toBeInTheDocument() // a Farmer's home

    await user.keyboard('{Escape}')

    expect(router.state.location.pathname).toBe('/')
  })

  it('shows the header profile button and no pop-up on ordinary pages', () => {
    renderAt('/farms')

    expect(screen.getByRole('button', { name: 'Account menu for Nimal Perera' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
