import { Navigate, type RouteObject } from 'react-router-dom'

/** The profile pop-up's addresses. AppLayout opens the pop-up itself when one of these matches. */
export const PROFILE_PATH = '/profile'
export const PROFILE_SECURITY_PATH = '/profile/security'

// No RequireRole wrapper — every role reaches this once authenticated, Admin included
// (AdminLoginPage is a separate entry point, but from there on the admin shares this layout).
export const accountRoutes: RouteObject[] = [
  // The old standalone change-password page is gone — Security settings (Part B) now owns
  // password changes, alongside every other identity/contact field. Old links and bookmarks
  // still work, landing straight on the Security tab.
  { path: '/account/password', element: <Navigate to={PROFILE_SECURITY_PATH} replace /> },
  // Nothing renders here: AppLayout draws the pop-up over the page behind it. The routes exist so
  // the address can be linked to and refreshed, and so RequireAuth guards it like any other page.
  { path: PROFILE_PATH, element: null },
  { path: PROFILE_SECURITY_PATH, element: null },
]
