import type { NavItem, Role } from '@/types/common'
import { farmsNavItems } from '@/features/farms/routes'
import { issuesNavItems } from '@/features/issues/routes'
import { marketplaceNavItems } from '@/features/marketplace/routes'
import { ordersNavItems } from '@/features/orders/routes'

const allNavItems: NavItem[] = [
  ...farmsNavItems,
  ...issuesNavItems,
  ...marketplaceNavItems,
  ...ordersNavItems,
]

export function getNavItemsForRole(role: Role | null): NavItem[] {
  if (!role) {
    return []
  }
  return allNavItems.filter((item) => item.allowedRoles.includes(role))
}
