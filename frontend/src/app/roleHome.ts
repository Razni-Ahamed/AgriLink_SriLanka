import type { Role } from '@/types/common'

export const roleHome: Record<Role, string> = {
  Farmer: '/farms',
  Officer: '/officer/dashboard',
  Buyer: '/marketplace/browse',
  Admin: '/admin',
}
