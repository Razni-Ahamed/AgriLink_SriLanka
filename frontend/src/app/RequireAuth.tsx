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
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
