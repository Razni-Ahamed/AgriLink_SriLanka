import type { RouteObject } from 'react-router-dom'
import { LockKey } from '@/components/ui/icons'
import type { NavItem } from '@/types/common'
import { ChangePasswordPage } from './pages/ChangePasswordPage'

// No RequireRole wrapper — every role reaches this once authenticated, Admin included
// (AdminLoginPage is a separate entry point, but from there on the admin shares this layout).
export const accountRoutes: RouteObject[] = [
  { path: '/account/password', element: <ChangePasswordPage /> },
]

export const accountNavItems: NavItem[] = [
  {
    labelKey: 'nav.changePassword',
    path: '/account/password',
    icon: <LockKey size={18} weight="duotone" />,
    allowedRoles: ['Farmer', 'Officer', 'Buyer', 'Admin'],
  },
]
