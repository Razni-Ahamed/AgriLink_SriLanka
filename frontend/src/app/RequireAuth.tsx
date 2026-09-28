import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/auth/authStore'

export function RequireAuth() {
  const token = useAuthStore((state) => state.token)
  const isHydrated = useAuthStore((state) => state.isHydrated)
  const location = useLocation()

  if (!isHydrated) {
    return null
  }

  if (!token) {
    // Someone who only opened the site (and was sent on from `/` by a stored session the server
    // then rejected) belongs on the landing page, not the login page. A deep link still asks them
    // to sign in and returns them to it afterwards.
    if ((location.state as { fromLanding?: boolean } | null)?.fromLanding) {
      return <Navigate to="/" replace />
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
