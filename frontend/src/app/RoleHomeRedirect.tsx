import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/auth/authStore'
import { roleHome } from './roleHome'

export function RoleHomeRedirect() {
  const role = useAuthStore((state) => state.role)

  if (!role) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={roleHome[role]} replace />
}
