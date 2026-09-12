import type { RouteObject } from 'react-router-dom'
import { FirstAidKit, ListChecks } from '@phosphor-icons/react'
import { RequireRole } from '@/app/RequireRole'
import type { NavItem } from '@/types/common'
import { AdvisoryDetailPage } from './pages/AdvisoryDetailPage'
import { MyIssuesPage } from './pages/MyIssuesPage'
import { NewIssuePage } from './pages/NewIssuePage'
import { PendingIssuesPage } from './pages/PendingIssuesPage'

export const issuesRoutes: RouteObject[] = [
  {
    // GET /api/issues/mine is [Authorize(Roles = "Farmer")] on the backend — Admin was in this
    // route's nav item but not in the API's allowed roles, so an Admin who opened "My Issues"
    // got a 403 straight from the API. Scoped to match what the backend actually authorizes.
    element: <RequireRole allow={['Farmer']} />,
    children: [
      { path: '/issues/mine', element: <MyIssuesPage /> },
      { path: '/issues/new', element: <NewIssuePage /> },
    ],
  },
  {
    element: <RequireRole allow={['Officer', 'Admin']} />,
    children: [{ path: '/issues/pending', element: <PendingIssuesPage /> }],
  },
  {
    // GET /api/advisories/{id} is open to any authenticated role, with an internal ownership
    // check for non-Officer/Admin callers — Buyer has no reason to be here, everyone else does.
    element: <RequireRole allow={['Farmer', 'Officer', 'Admin']} />,
    children: [{ path: '/advisories/:advisoryId', element: <AdvisoryDetailPage /> }],
  },
]

export const issuesNavItems: NavItem[] = [
  {
    labelKey: 'nav.myIssues',
    path: '/issues/mine',
    icon: <FirstAidKit size={18} weight="duotone" />,
    allowedRoles: ['Farmer'],
  },
  {
    labelKey: 'nav.pendingIssues',
    path: '/issues/pending',
    icon: <ListChecks size={18} weight="duotone" />,
    allowedRoles: ['Officer', 'Admin'],
  },
]
