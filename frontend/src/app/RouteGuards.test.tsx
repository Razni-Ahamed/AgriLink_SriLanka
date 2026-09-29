import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/auth/authStore'
import type { Role } from '@/types/common'
import { RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'

function LoginProbe() {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  return <p>Login page (from {from ?? 'nowhere'})</p>
}

// The same nesting as pageRoutes: RequireAuth first, then each feature's RequireRole.
function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginProbe /> },
      { path: '/unauthorized', element: <p>No access</p> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <RequireRole allow={['Farmer']} />,
            children: [{ path: '/farms', element: <p>Farms page</p> }],
          },
          {
            element: <RequireRole allow={['Officer', 'Admin']} />,
            children: [{ path: '/issues/pending', element: <p>Review queue</p> }],
          },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
}

function signIn(role: Role | null) {
  useAuthStore.setState({ token: role ? 'jwt' : null, role, isHydrated: true })
}

describe('protected routes', () => {
  afterEach(() => {
    useAuthStore.setState({ token: null, role: null, user: null, isHydrated: false })
  })

  it('sends a signed-out visitor to the login page and remembers where they were going', () => {
    signIn(null)
    renderAt('/farms')

    expect(screen.getByText('Login page (from /farms)')).toBeInTheDocument()
    expect(screen.queryByText('Farms page')).not.toBeInTheDocument()
  })

  it('lets a farmer into a farmer page', () => {
    signIn('Farmer')
    renderAt('/farms')

    expect(screen.getByText('Farms page')).toBeInTheDocument()
  })

  it.each<Role>(['Buyer', 'Officer', 'Admin'])('keeps a %s out of a farmer page', (role) => {
    signIn(role)
    renderAt('/farms')

    expect(screen.getByText('No access')).toBeInTheDocument()
    expect(screen.queryByText('Farms page')).not.toBeInTheDocument()
  })

  it.each<Role>(['Officer', 'Admin'])('lets an %s into the review queue', (role) => {
    signIn(role)
    renderAt('/issues/pending')

    expect(screen.getByText('Review queue')).toBeInTheDocument()
  })

  it('keeps a farmer out of the review queue', () => {
    signIn('Farmer')
    renderAt('/issues/pending')

    expect(screen.getByText('No access')).toBeInTheDocument()
  })

  it('renders nothing until the stored session has been read', () => {
    useAuthStore.setState({ token: 'jwt', role: 'Farmer', isHydrated: false })
    renderAt('/farms')

    expect(screen.queryByText('Farms page')).not.toBeInTheDocument()
    expect(screen.queryByText(/Login page/)).not.toBeInTheDocument()
  })
})
