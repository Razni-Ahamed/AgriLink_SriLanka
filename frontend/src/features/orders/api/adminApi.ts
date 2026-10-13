import { apiClient } from '@/lib/apiClient'
import type {
  AdminMetricsResponse,
  AdminResetPasswordRequest,
  AdminUpdateUserProfileRequest,
  AdminUserSummary,
  AuditLogEntry,
  CreateUserRequest,
  CreateUserResponse,
  Department,
  DepartmentRequest,
  PhotoDiagnosisSummaryResponse,
  UpdateUserRoleRequest,
  UpdateUserStatusRequest,
} from '@/types/dto/admin'
import type { PagedResponse } from '@/types/dto/paging'

export async function getAdminMetrics(): Promise<AdminMetricsResponse> {
  const { data } = await apiClient.get<AdminMetricsResponse>('/api/admin/metrics')
  return data
}

export async function getPhotoDiagnosisSummary(): Promise<PhotoDiagnosisSummaryResponse> {
  const { data } = await apiClient.get<PhotoDiagnosisSummaryResponse>('/api/admin/photo-diagnoses/summary')
  return data
}

/** The confirmed photos as a .zip, saved through the browser. The request carries the admin's
 *  token, so this can't be a plain link. */
export async function downloadConfirmedPhotos(): Promise<void> {
  const response = await apiClient.get<Blob>('/api/admin/photo-diagnoses/export', { responseType: 'blob' })
  const disposition = String(response.headers['content-disposition'] ?? '')
  const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `agrilink-confirmed-photos-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}.zip`
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export async function createUser(request: CreateUserRequest): Promise<CreateUserResponse> {
  const { data } = await apiClient.post<CreateUserResponse>('/api/admin/users', request)
  return data
}

export async function getRoles(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/api/admin/roles')
  return data
}

export async function getUsers(): Promise<AdminUserSummary[]> {
  const { data } = await apiClient.get<AdminUserSummary[]>('/api/admin/users')
  return data
}

export async function updateUserRole(
  userId: number,
  request: UpdateUserRoleRequest,
): Promise<AdminUserSummary> {
  const { data } = await apiClient.put<AdminUserSummary>(`/api/admin/users/${userId}/role`, request)
  return data
}

export async function updateUserStatus(
  userId: number,
  request: UpdateUserStatusRequest,
): Promise<AdminUserSummary> {
  const { data } = await apiClient.put<AdminUserSummary>(`/api/admin/users/${userId}/status`, request)
  return data
}

export async function updateUserProfile(
  userId: number,
  request: AdminUpdateUserProfileRequest,
): Promise<AdminUserSummary> {
  const { data } = await apiClient.put<AdminUserSummary>(`/api/admin/users/${userId}/profile`, request)
  return data
}

/** No email-based reset flow exists — this is how a user who forgot their password gets back in. */
export async function resetUserPassword(
  userId: number,
  request: AdminResetPasswordRequest,
): Promise<void> {
  await apiClient.post(`/api/admin/users/${userId}/password`, request)
}

export async function getAuditLogs(
  page: number,
  entityName?: string,
): Promise<PagedResponse<AuditLogEntry>> {
  const { data } = await apiClient.get<PagedResponse<AuditLogEntry>>('/api/admin/audit-logs', {
    params: { page, entityName },
  })
  return data
}

export async function getDepartments(): Promise<Department[]> {
  const { data } = await apiClient.get<Department[]>('/api/admin/departments')
  return data
}

export async function createDepartment(request: DepartmentRequest): Promise<Department> {
  const { data } = await apiClient.post<Department>('/api/admin/departments', request)
  return data
}

export async function renameDepartment(
  departmentId: number,
  request: DepartmentRequest,
): Promise<Department> {
  const { data } = await apiClient.put<Department>(`/api/admin/departments/${departmentId}`, request)
  return data
}

export async function deleteDepartment(departmentId: number): Promise<void> {
  await apiClient.delete(`/api/admin/departments/${departmentId}`)
}
