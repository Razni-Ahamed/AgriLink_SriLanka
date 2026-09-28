import { apiClient } from '@/lib/apiClient'
import type { PendingRegistrationResponse, RejectRegistrationRequest } from '@/types/dto/registrations'

export async function getPendingRegistrations(): Promise<PendingRegistrationResponse[]> {
  const { data } = await apiClient.get<PendingRegistrationResponse[]>('/api/registrations/pending')
  return data
}

/** Rejected applications the caller could decide, newest rejection first. */
export async function getRejectedRegistrations(): Promise<PendingRegistrationResponse[]> {
  const { data } = await apiClient.get<PendingRegistrationResponse[]>('/api/registrations/rejected')
  return data
}

/** Approves a pending application, or reverses the rejection of a rejected one. */
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
