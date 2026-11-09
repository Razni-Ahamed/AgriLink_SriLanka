import type { RouteObject } from 'react-router-dom'
import { Farm as FarmIcon } from '@phosphor-icons/react'
import { RequireRole } from '@/app/RequireRole'
import type { NavItem } from '@/types/common'
import { lazyPage } from '@/lib/lazyPage'

const FarmsListPage = lazyPage(() => import('./pages/FarmsListPage'), 'FarmsListPage')
const FarmDetailPage = lazyPage(() => import('./pages/FarmDetailPage'), 'FarmDetailPage')
const FieldDetailPage = lazyPage(() => import('./pages/FieldDetailPage'), 'FieldDetailPage')
const CropDetailPage = lazyPage(() => import('./pages/CropDetailPage'), 'CropDetailPage')

/**
 * Farmer-only: every FarmsController/CropsController write requires a FarmerProfileId, which
 * an Admin account never has (POST /api/farms 403s for Admin even though the class-level
 * [Authorize(Roles="Farmer,Admin")] lets Admin reach the page). Admin previously had this in
 * its nav — a page it couldn't fully use, gated on a role check that let it in but a backend
 * check that then partly turned it away. Scoping this to Farmer only removes that mismatch.
 */
export const farmsRoutes: RouteObject[] = [
  {
    element: <RequireRole allow={['Farmer']} />,
    children: [
      { path: '/farms', element: <FarmsListPage /> },
      { path: '/farms/:farmId', element: <FarmDetailPage /> },
      { path: '/farms/:farmId/fields/:fieldId', element: <FieldDetailPage /> },
      { path: '/farms/:farmId/fields/:fieldId/crops/:cropId', element: <CropDetailPage /> },
    ],
  },
]

export const farmsNavItems: NavItem[] = [
  {
    labelKey: 'nav.farms',
    path: '/farms',
    icon: <FarmIcon size={18} weight="duotone" />,
    allowedRoles: ['Farmer'],
  },
]
