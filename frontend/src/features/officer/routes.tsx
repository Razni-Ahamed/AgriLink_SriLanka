import type { RouteObject } from 'react-router-dom'
import { Gauge } from '@phosphor-icons/react'
import { RequireRole } from '@/app/RequireRole'
import type { NavItem } from '@/types/common'
import { OfficerDashboardPage } from './pages/OfficerDashboardPage'

export const officerRoutes: RouteObject[] = [
  {
    // GET /api/officer/metrics is [Authorize(Roles = "Officer")] — Admin has its own dashboard
    // at /admin backed by GET /api/admin/metrics, not this one.
    element: <RequireRole allow={['Officer']} />,
    children: [{ path: '/officer/dashboard', element: <OfficerDashboardPage /> }],
  },
]

export const officerNavItems: NavItem[] = [
  {
    labelKey: 'nav.officerDashboard',
    path: '/officer/dashboard',
    icon: <Gauge size={18} weight="duotone" />,
    allowedRoles: ['Officer'],
  },
]
