import type { ReactNode } from 'react'

export type Role = 'Farmer' | 'Officer' | 'Buyer' | 'Admin'

export interface ApiError {
  message: string
  status: number
}

export interface NavItem {
  label: string
  path: string
  icon: ReactNode
  allowedRoles: Role[]
}
