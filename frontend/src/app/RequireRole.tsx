import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/auth/authStore'
import type { Role } from '@/types/common'

interface RequireRoleProps {
  allow: Role[]
}

export function RequireRole({ allow }: RequireRoleProps) {
  const role = useAuthStore((state) => state.role)

  if (!role || !allow.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
