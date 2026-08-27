import type { Role } from '@/types/common'

export const roleHome: Record<Role, string> = {
  Farmer: '/farms',
  Officer: '/issues/pending',
  Buyer: '/marketplace/browse',
  Admin: '/admin',
}
