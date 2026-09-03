import type { RouteObject } from 'react-router-dom'
import { FirstAidKit, ListChecks } from '@phosphor-icons/react'
import type { NavItem } from '@/types/common'
import { AdvisoryDetailPage } from './pages/AdvisoryDetailPage'
import { MyIssuesPage } from './pages/MyIssuesPage'
import { NewIssuePage } from './pages/NewIssuePage'
import { PendingIssuesPage } from './pages/PendingIssuesPage'

export const issuesRoutes: RouteObject[] = [
  { path: '/issues/mine', element: <MyIssuesPage /> },
  { path: '/issues/new', element: <NewIssuePage /> },
  { path: '/issues/pending', element: <PendingIssuesPage /> },
  { path: '/advisories/:advisoryId', element: <AdvisoryDetailPage /> },
]

export const issuesNavItems: NavItem[] = [
  {
    labelKey: 'nav.myIssues',
    path: '/issues/mine',
    icon: <FirstAidKit size={18} weight="duotone" />,
    allowedRoles: ['Farmer', 'Admin'],
  },
  {
    labelKey: 'nav.pendingIssues',
    path: '/issues/pending',
    icon: <ListChecks size={18} weight="duotone" />,
    allowedRoles: ['Officer', 'Admin'],
  },
]
