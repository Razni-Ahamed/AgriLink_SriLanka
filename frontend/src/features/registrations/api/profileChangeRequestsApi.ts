import { apiClient } from '@/lib/apiClient'
import type { Role } from '@/types/common'
import type { PagedResponse } from '@/types/dto/paging'

export type ChangeRequestField = 'FullName' | 'NIC' | 'Email'

/** Mirrors AgriLink.API.DTOs.Accounts.PendingChangeRequestResponse. */
export interface PendingChangeRequestResponse {
  requestId: number
  userId: number
  fullName: string
  username: string
  role: Role
  profilePhotoUrl?: string | null
  /** The requester's current district — absent for an Admin (who has none). */
  district?: string | null
  field: ChangeRequestField
  oldValue: string
  newValue: string
  requestedAt: string
}

export async function getPendingChangeRequests(
  page: number,
): Promise<PagedResponse<PendingChangeRequestResponse>> {
  const { data } = await apiClient.get<PagedResponse<PendingChangeRequestResponse>>(
    '/api/profile-change-requests/pending',
    { params: { page } },
  )
  return data
}

/** Approving re-authenticates the approver's own password, exactly like every other security
 *  action — the server checks it independently of anything the client believes about the request. */
export async function approveChangeRequest(requestId: number, currentPassword: string): Promise<void> {
  await apiClient.post(`/api/profile-change-requests/${requestId}/approve`, { currentPassword })
}

export async function rejectChangeRequest(requestId: number, reason: string): Promise<void> {
  await apiClient.post(`/api/profile-change-requests/${requestId}/reject`, { reason })
}
