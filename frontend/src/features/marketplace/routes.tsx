import type { RouteObject } from 'react-router-dom'
import { Basket, ClipboardText, Storefront } from '@phosphor-icons/react'
import { RequireRole } from '@/app/RequireRole'
import type { NavItem } from '@/types/common'
import { BrowseHarvestsPage } from './pages/BrowseHarvestsPage'
import { HarvestDetailPage } from './pages/HarvestDetailPage'
import { MyListingsPage } from './pages/MyListingsPage'
import { MyPurchaseRequestsPage } from './pages/MyPurchaseRequestsPage'
import { MySentPurchaseRequestsPage } from './pages/MySentPurchaseRequestsPage'

/** Public — GET /api/harvests has no [Authorize], so this must render outside RequireAuth. */
export const marketplacePublicRoutes: RouteObject[] = [
  { path: '/marketplace/browse', element: <BrowseHarvestsPage /> },
]

/**
 * GET /api/harvests/mine and GET /api/purchase-requests/mine are both
 * [Authorize(Roles = "Farmer")] — Admin was in this route group's nav (and Buyer in
 * /marketplace/requests') without being authorized for either endpoint, so opening either page
 * as anything but a Farmer 403'd straight from the API. Split so each sub-route's role check
 * matches what its backend endpoint actually allows.
 */
export const marketplaceRoutes: RouteObject[] = [
  {
    element: <RequireRole allow={['Farmer']} />,
    children: [
      { path: '/marketplace/mine', element: <MyListingsPage /> },
      { path: '/marketplace/requests', element: <MyPurchaseRequestsPage /> },
    ],
  },
  {
    // GET /api/purchase-requests/sent is [Authorize(Roles = "Buyer")] — a buyer's own
    // submitted requests, distinct from /marketplace/requests above (a farmer's incoming ones).
    element: <RequireRole allow={['Buyer']} />,
    children: [{ path: '/marketplace/sent-requests', element: <MySentPurchaseRequestsPage /> }],
  },
  {
    // GET /api/harvests/{id} is [Authorize] only — any authenticated role may view a listing.
    element: <RequireRole allow={['Farmer', 'Buyer', 'Admin']} />,
    children: [{ path: '/marketplace/:harvestId', element: <HarvestDetailPage /> }],
  },
]

export const marketplaceNavItems: NavItem[] = [
  {
    labelKey: 'nav.marketplace',
    path: '/marketplace/browse',
    icon: <Storefront size={18} weight="duotone" />,
    allowedRoles: ['Farmer', 'Buyer', 'Admin'],
  },
  {
    labelKey: 'nav.myListings',
    path: '/marketplace/mine',
    icon: <Basket size={18} weight="duotone" />,
    allowedRoles: ['Farmer'],
  },
  {
    labelKey: 'nav.myRequests',
    path: '/marketplace/requests',
    icon: <ClipboardText size={18} weight="duotone" />,
    allowedRoles: ['Farmer'],
  },
  {
    // Same label as the Farmer item above — a Buyer never sees the Farmer's entry (and vice
    // versa), since allowedRoles keeps the two mutually exclusive, but each is "my requests"
    // from that role's own vantage point (incoming vs. sent).
    labelKey: 'nav.myRequests',
    path: '/marketplace/sent-requests',
    icon: <ClipboardText size={18} weight="duotone" />,
    allowedRoles: ['Buyer'],
  },
]
