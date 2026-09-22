export interface CreateUserRequest {
  fullName: string
  email: string
  /** Optional — the server generates one from the full name when omitted. */
  username?: string
  password: string
  /** "Officer" or "Buyer" */
  role: 'Officer' | 'Buyer'
  district: string
  /** Required when role is "Officer" */
  departmentId?: number
  /** Required when role is "Buyer" */
  businessName?: string
}

export interface CreateUserResponse {
  userId: number
  fullName: string
  email: string
  username: string
  role: string
}

export interface AdminMetricsResponse {
  totalUsers: number
  totalFarms: number
  totalCrops: number
  issuesReported: number
  issuesPending: number
  issuesResolved: number
  harvestVolumeSoldThisMonth: number
}

export type ManagedRole = 'Farmer' | 'Officer' | 'Buyer' | 'Admin'

export interface AdminUserSummary {
  userId: number
  fullName: string
  email: string
  username: string
  /** Public https URL; null shows the role's default avatar. */
  profilePhotoUrl?: string | null
  role: ManagedRole
  district?: string | null
  /** Populated only for Officer accounts. */
  department?: string | null
  isActive: boolean
  createdAt: string
}

export interface UpdateUserRoleRequest {
  /** "Officer" or "Buyer" — Farmer and Admin accounts can't be re-typed through this endpoint. */
  role: 'Officer' | 'Buyer'
  district: string
  /** Required when role is "Officer" */
  departmentId?: number
  /** Required when role is "Buyer" */
  businessName?: string
}

export interface UpdateUserStatusRequest {
  isActive: boolean
}

/**
 * Allowed-fields DTO for PUT /api/admin/users/{id}/profile — mirrors the backend's own DTO,
 * which is deliberately not the entity (role, IsActive, RegistrationStatus and anything
 * password-related aren't on it, so they can never be set through this endpoint).
 *
 * Every field is optional: omitting it (not sending the key at all) means "leave this alone".
 * The admin table has no way to show a user's current NIC/phone/display name/business details
 * beforehand, so this form only pre-fills what it already knows (full name, email, district) —
 * every other field is typed fresh or left out, never sent as an empty-string clear.
 */
export interface AdminUpdateUserProfileRequest {
  fullName?: string
  displayName?: string
  email?: string
  phoneNumber?: string
  /** Farmer/Buyer only. */
  nic?: string
  /** Farmer/Buyer/Officer only. */
  district?: string
  /** Buyer only. */
  businessRegistrationNumber?: string
  /** Buyer only. */
  businessName?: string
  /** Farmer only. */
  fieldPlotNumber?: string
}

export interface AdminResetPasswordRequest {
  newPassword: string
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

export interface Department {
  departmentId: number
  name: string
  createdAt: string
}

export interface DepartmentRequest {
  name: string
}
