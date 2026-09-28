import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/auth/authStore'
import { HomePage } from '@/features/home/HomePage'
import { roleHome } from './roleHome'

/** `/`: the public landing page for visitors, or straight on to their role's home once signed in. */
export function HomeRoute() {
  const role = useAuthStore((state) => state.role)
  const isHydrated = useAuthStore((state) => state.isHydrated)

  // Wait for the stored session, or a signed-in user would see the landing page flash first.
  if (!isHydrated) {
    return null
  }

  if (!role) {
    return <HomePage />
  }

  // Marked as coming from `/`, so if the server turns out to have ended this session (a password
  // change, a deactivated account), RequireAuth returns the visitor here rather than to /login.
  return <Navigate to={roleHome[role]} replace state={{ fromLanding: true }} />
}
