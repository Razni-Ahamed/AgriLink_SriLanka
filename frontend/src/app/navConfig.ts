import type { NavItem, Role } from '@/types/common'
import { accountNavItems } from '@/features/account/routes'
import { farmsNavItems } from '@/features/farms/routes'
import { issuesNavItems } from '@/features/issues/routes'
import { marketplaceNavItems } from '@/features/marketplace/routes'
import { officerNavItems } from '@/features/officer/routes'
import { ordersNavItems } from '@/features/orders/routes'
import { registrationsNavItems } from '@/features/registrations/routes'

const allNavItems: NavItem[] = [
  ...farmsNavItems,
  ...issuesNavItems,
  ...marketplaceNavItems,
  ...officerNavItems,
  ...ordersNavItems,
  ...registrationsNavItems,
  ...accountNavItems,
]

export function getNavItemsForRole(role: Role | null): NavItem[] {
  if (!role) {
    return []
  }
  return allNavItems.filter((item) => item.allowedRoles.includes(role))
}
