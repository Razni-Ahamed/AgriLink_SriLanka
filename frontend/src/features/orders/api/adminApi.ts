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
  UpdateUserRoleRequest,
  UpdateUserStatusRequest,
} from '@/types/dto/admin'
import type { PagedResponse } from '@/types/dto/paging'

export async function getAdminMetrics(): Promise<AdminMetricsResponse> {
  const { data } = await apiClient.get<AdminMetricsResponse>('/api/admin/metrics')
  return data
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
