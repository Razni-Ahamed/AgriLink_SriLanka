import { apiClient } from '@/lib/apiClient'
import type { AdminMetricsResponse, CreateUserRequest, CreateUserResponse } from '@/types/dto/admin'

export async function getAdminMetrics(): Promise<AdminMetricsResponse> {
  const { data } = await apiClient.get<AdminMetricsResponse>('/api/admin/metrics')
  return data
}

export async function createUser(request: CreateUserRequest): Promise<CreateUserResponse> {
  const { data } = await apiClient.post<CreateUserResponse>('/api/admin/users', request)
  return data
}
