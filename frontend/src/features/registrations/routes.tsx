import type { RouteObject } from 'react-router-dom'
import { UserPlus } from '@phosphor-icons/react'
import { RequireRole } from '@/app/RequireRole'
import type { NavItem } from '@/types/common'
import { PendingRegistrationsPage } from './pages/PendingRegistrationsPage'

export const registrationsRoutes: RouteObject[] = [
  {
    // GET /api/registrations/pending is [Authorize(Roles = "Officer,Admin")] — the backend
    // itself scopes what each role sees (Officer: own-district Farmer applications only;
    // Admin: every Farmer and Buyer application).
    element: <RequireRole allow={['Officer', 'Admin']} />,
    children: [{ path: '/registrations/pending', element: <PendingRegistrationsPage /> }],
  },
]

export const registrationsNavItems: NavItem[] = [
  {
    labelKey: 'nav.pendingRegistrations',
    path: '/registrations/pending',
    icon: <UserPlus size={18} weight="duotone" />,
    allowedRoles: ['Officer', 'Admin'],
  },
]
