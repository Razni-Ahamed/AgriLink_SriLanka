import type { RouteObject } from 'react-router-dom'
import { Basket, ClipboardText, Storefront } from '@phosphor-icons/react'
import type { NavItem } from '@/types/common'
import { BrowseHarvestsPage } from './pages/BrowseHarvestsPage'
import { HarvestDetailPage } from './pages/HarvestDetailPage'
import { MyListingsPage } from './pages/MyListingsPage'
import { MyPurchaseRequestsPage } from './pages/MyPurchaseRequestsPage'

/** Public — GET /api/harvests has no [Authorize], so this must render outside RequireAuth. */
export const marketplacePublicRoutes: RouteObject[] = [
  { path: '/marketplace/browse', element: <BrowseHarvestsPage /> },
]

/** Everything else requires a logged-in user (GET /api/harvests/{id} has [Authorize]). */
export const marketplaceRoutes: RouteObject[] = [
  { path: '/marketplace/mine', element: <MyListingsPage /> },
  { path: '/marketplace/requests', element: <MyPurchaseRequestsPage /> },
  { path: '/marketplace/:harvestId', element: <HarvestDetailPage /> },
]

export const marketplaceNavItems: NavItem[] = [
  {
    label: 'Marketplace',
    path: '/marketplace/browse',
    icon: <Storefront size={18} weight="duotone" />,
    allowedRoles: ['Farmer', 'Buyer', 'Admin'],
  },
  {
    label: 'My Listings',
    path: '/marketplace/mine',
    icon: <Basket size={18} weight="duotone" />,
    allowedRoles: ['Farmer', 'Admin'],
  },
  {
    label: 'My Requests',
    path: '/marketplace/requests',
    icon: <ClipboardText size={18} weight="duotone" />,
    allowedRoles: ['Farmer', 'Admin'],
  },
]
