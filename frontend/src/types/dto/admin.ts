export interface CreateUserRequest {
  fullName: string
  email: string
  password: string
  /** "Officer" or "Buyer" */
  role: 'Officer' | 'Buyer'
  district: string
  /** Required when role is "Officer" */
  department?: string
  /** Required when role is "Buyer" */
  businessName?: string
}

export interface CreateUserResponse {
  userId: number
  fullName: string
  email: string
  role: string
}

export interface AdminMetricsResponse {
  totalUsers: number
  totalFarms: number
  totalCrops: number
  issuesReported: number
  issuesResolved: number
  harvestVolumeSoldThisMonth: number
}

export type ManagedRole = 'Farmer' | 'Officer' | 'Buyer' | 'Admin'

export interface AdminUserSummary {
  userId: number
  fullName: string
  email: string
  role: ManagedRole
  district?: string | null
  isActive: boolean
  createdAt: string
}

export interface UpdateUserRoleRequest {
  /** "Officer" or "Buyer" — Farmer and Admin accounts can't be re-typed through this endpoint. */
  role: 'Officer' | 'Buyer'
  district: string
  /** Required when role is "Officer" */
  department?: string
  /** Required when role is "Buyer" */
  businessName?: string
}

export interface UpdateUserStatusRequest {
  isActive: boolean
}

export interface AuditLogEntry {
  auditId: number
  userId: number
  userName: string
  action: string
  entityName: string
  entityId: number
  oldValue: string | null
  newValue: string | null
  createdAt: string
}
