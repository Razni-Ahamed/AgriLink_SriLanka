import { apiClient } from '@/lib/apiClient'
import type {
  AdminMetricsResponse,
  AdminUserSummary,
  AuditLogEntry,
  CreateUserRequest,
  CreateUserResponse,
  Department,
  DepartmentRequest,
  UpdateUserRoleRequest,
  UpdateUserStatusRequest,
} from '@/types/dto/admin'

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

export async function getAuditLogs(entityName?: string): Promise<AuditLogEntry[]> {
  const { data } = await apiClient.get<AuditLogEntry[]>('/api/admin/audit-logs', {
    params: entityName ? { entityName } : undefined,
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
