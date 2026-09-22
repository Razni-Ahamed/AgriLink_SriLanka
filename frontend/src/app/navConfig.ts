import type { NavItem, Role } from '@/types/common'
import { farmsNavItems } from '@/features/farms/routes'
import { issuesNavItems } from '@/features/issues/routes'
import { marketplaceNavItems } from '@/features/marketplace/routes'
import { officerNavItems } from '@/features/officer/routes'
import { ordersNavItems } from '@/features/orders/routes'
import { registrationsNavItems } from '@/features/registrations/routes'

// Change password moved into the profile menu's Security tab (Part B) — there is no longer a
// standalone account nav item; every role reaches it via the header's profile button instead.
const allNavItems: NavItem[] = [
  ...farmsNavItems,
  ...issuesNavItems,
  ...marketplaceNavItems,
  ...officerNavItems,
  ...ordersNavItems,
  ...registrationsNavItems,
]

export function getNavItemsForRole(role: Role | null): NavItem[] {
  if (!role) {
    return []
  }
  return allNavItems.filter((item) => item.allowedRoles.includes(role))
}
