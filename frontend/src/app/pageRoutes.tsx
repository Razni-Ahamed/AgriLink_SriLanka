import type { RouteObject } from 'react-router-dom'
import { accountRoutes } from '@/features/account/routes'
import { farmsRoutes } from '@/features/farms/routes'
import { issuesRoutes } from '@/features/issues/routes'
import { marketplacePublicRoutes, marketplaceRoutes } from '@/features/marketplace/routes'
import { officerRoutes } from '@/features/officer/routes'
import { ordersRoutes } from '@/features/orders/routes'
import { registrationsRoutes } from '@/features/registrations/routes'
import { RequireAuth } from './RequireAuth'
import { RoleHomeRedirect } from './RoleHomeRedirect'
import { UnauthorizedPage } from './UnauthorizedPage'

/**
 * Every page rendered inside AppLayout. Its own module (rather than inline in routes.tsx) because
 * AppLayout also matches against it: the profile pop-up renders over the page the user came from,
 * which AppLayout draws from this table for that earlier location.
 */
export const pageRoutes: RouteObject[] = [
  ...marketplacePublicRoutes,
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <RoleHomeRedirect /> },
      // Each feature's own routes.tsx wraps its sub-routes in RequireRole scoped to
      // exactly what its backend endpoints authorize (see the comments there) — no
      // single coarse role list here, since farms/issues/marketplace mix Farmer-only,
      // Officer-only, and shared sub-routes that a single wrapper can't tell apart.
      ...accountRoutes,
      ...farmsRoutes,
      ...issuesRoutes,
      ...marketplaceRoutes,
      ...officerRoutes,
      ...ordersRoutes,
      ...registrationsRoutes,
      { path: '/unauthorized', element: <UnauthorizedPage /> },
    ],
  },
]
