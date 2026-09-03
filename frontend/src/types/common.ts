import type { ReactNode } from 'react'

export type Role = 'Farmer' | 'Officer' | 'Buyer' | 'Admin'

export interface ApiError {
  message: string
  status: number
}

/** Keys under `common:nav` — listed so `t(item.labelKey)` stays type-checked. */
export type NavLabelKey =
  | 'nav.farms'
  | 'nav.myIssues'
  | 'nav.pendingIssues'
  | 'nav.marketplace'
  | 'nav.myListings'
  | 'nav.myRequests'
  | 'nav.orders'
  | 'nav.notifications'
  | 'nav.adminDashboard'
  | 'nav.manageUsers'

export interface NavItem {
  labelKey: NavLabelKey
  path: string
  icon: ReactNode
  allowedRoles: Role[]
}
