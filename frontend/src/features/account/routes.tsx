import type { RouteObject } from 'react-router-dom'
import { LockKey } from '@/components/ui/icons'
import type { NavItem } from '@/types/common'
import { ChangePasswordPage } from './pages/ChangePasswordPage'

/** The profile pop-up's addresses. AppLayout opens the pop-up itself when one of these matches. */
export const PROFILE_PATH = '/profile'
export const PROFILE_SECURITY_PATH = '/profile/security'

// No RequireRole wrapper — every role reaches this once authenticated, Admin included
// (AdminLoginPage is a separate entry point, but from there on the admin shares this layout).
export const accountRoutes: RouteObject[] = [
  { path: '/account/password', element: <ChangePasswordPage /> },
  // Nothing renders here: AppLayout draws the pop-up over the page behind it. The routes exist so
  // the address can be linked to and refreshed, and so RequireAuth guards it like any other page.
  { path: PROFILE_PATH, element: null },
  { path: PROFILE_SECURITY_PATH, element: null },
]

export const accountNavItems: NavItem[] = [
  {
    labelKey: 'nav.changePassword',
    path: '/account/password',
    icon: <LockKey size={18} weight="duotone" />,
    allowedRoles: ['Farmer', 'Officer', 'Buyer', 'Admin'],
  },
]
