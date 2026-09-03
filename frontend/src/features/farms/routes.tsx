import type { RouteObject } from 'react-router-dom'
import { Farm as FarmIcon } from '@phosphor-icons/react'
import type { NavItem } from '@/types/common'
import { FarmsListPage } from './pages/FarmsListPage'
import { FarmDetailPage } from './pages/FarmDetailPage'
import { FieldDetailPage } from './pages/FieldDetailPage'
import { CropDetailPage } from './pages/CropDetailPage'

export const farmsRoutes: RouteObject[] = [
  { path: '/farms', element: <FarmsListPage /> },
  { path: '/farms/:farmId', element: <FarmDetailPage /> },
  { path: '/farms/:farmId/fields/:fieldId', element: <FieldDetailPage /> },
  { path: '/farms/:farmId/fields/:fieldId/crops/:cropId', element: <CropDetailPage /> },
]

export const farmsNavItems: NavItem[] = [
  {
    labelKey: 'nav.farms',
    path: '/farms',
    icon: <FarmIcon size={18} weight="duotone" />,
    allowedRoles: ['Farmer', 'Admin'],
  },
]
