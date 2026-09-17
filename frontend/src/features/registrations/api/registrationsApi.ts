import { apiClient } from '@/lib/apiClient'
import type { PendingRegistrationResponse, RejectRegistrationRequest } from '@/types/dto/registrations'

export async function getPendingRegistrations(): Promise<PendingRegistrationResponse[]> {
  const { data } = await apiClient.get<PendingRegistrationResponse[]>('/api/registrations/pending')
  return data
}

export async function approveRegistration(userId: number): Promise<PendingRegistrationResponse> {
  const { data } = await apiClient.post<PendingRegistrationResponse>(
    `/api/registrations/${userId}/approve`,
  )
  return data
}

export async function rejectRegistration(
  userId: number,
  request: RejectRegistrationRequest,
): Promise<PendingRegistrationResponse> {
  const { data } = await apiClient.post<PendingRegistrationResponse>(
    `/api/registrations/${userId}/reject`,
    request,
  )
  return data
}
