import { apiClient } from '@/lib/apiClient'
import type { AuthResponse, UserProfileResponse } from '@/auth/api'

/** Matches AgriLink.API.Services.Accounts.SecurityCapabilities' role matrix. */
export type SecurityCapability = 'password' | 'phone' | 'fullName' | 'email' | 'nic'

export type ChangeRequestField = 'FullName' | 'NIC' | 'Email'
export type ChangeRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn'

export interface ChangeRequestSummary {
  requestId: number
  field: ChangeRequestField
  oldValue: string
  newValue: string
  status: ChangeRequestStatus
  requestedAt: string
  decidedAt?: string | null
  rejectionReason?: string | null
}

export interface SecuritySettingsResponse {
  canChange: SecurityCapability[]
  canRequest: SecurityCapability[]
  phoneNumber?: string | null
  nic?: string | null
  changeRequests: ChangeRequestSummary[]
}

export async function getSecuritySettings(): Promise<SecuritySettingsResponse> {
  const { data } = await apiClient.get<SecuritySettingsResponse>('/api/users/me/security')
  return data
}

/** The Security tab's "unlock" step — a convenience only; every change below re-checks itself. */
export async function verifyPassword(currentPassword: string): Promise<void> {
  await apiClient.post('/api/users/me/verify-password', { currentPassword })
}

export interface UpdatePhoneRequest {
  currentPassword: string
  /** Empty clears it — allowed only for Officer/Admin; Farmer/Buyer must keep one. */
  phoneNumber?: string
}

export async function updatePhone(request: UpdatePhoneRequest): Promise<UserProfileResponse> {
  const { data } = await apiClient.put<UserProfileResponse>('/api/users/me/phone', request)
  return data
}

export interface CreateChangeRequestRequest {
  currentPassword: string
  field: ChangeRequestField
  newValue: string
}

export type CreateChangeRequestResult =
  | { kind: 'applied'; profile: UserProfileResponse }
  | { kind: 'appliedWithToken'; auth: AuthResponse }
  | { kind: 'requested'; request: ChangeRequestSummary }

/**
 * Admin: the server applies full name / email directly (email comes back as a fresh token+role,
 * since it rotates the security stamp — same shape POST /me/password returns). Everyone else:
 * the server opens a Pending request and returns its summary. The caller already knows its own
 * role and which field it asked for, so it picks the right branch of the result itself.
 */
export async function createChangeRequest(
  request: CreateChangeRequestRequest,
  isAdmin: boolean,
): Promise<CreateChangeRequestResult> {
  const { data } = await apiClient.post('/api/users/me/change-requests', request)
  if (!isAdmin) {
    return { kind: 'requested', request: data as ChangeRequestSummary }
  }
  if (request.field === 'Email') {
    return { kind: 'appliedWithToken', auth: data as AuthResponse }
  }
  return { kind: 'applied', profile: data as UserProfileResponse }
}

export async function withdrawChangeRequest(requestId: number): Promise<void> {
  await apiClient.delete(`/api/users/me/change-requests/${requestId}`)
}
