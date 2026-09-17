import { apiClient } from '@/lib/apiClient'
import type { AdvisoryResponse, ReviewAdvisoryRequest } from '@/types/dto/advisories'

export async function getAdvisory(advisoryId: number): Promise<AdvisoryResponse> {
  const { data } = await apiClient.get<AdvisoryResponse>(`/api/advisories/${advisoryId}`)
  return data
}

export async function approveAdvisory(
  advisoryId: number,
  review: ReviewAdvisoryRequest = {},
): Promise<AdvisoryResponse> {
  const { data } = await apiClient.post<AdvisoryResponse>(
    `/api/advisories/${advisoryId}/approve`,
    review,
  )
  return data
}

export async function rejectAdvisory(
  advisoryId: number,
  review: ReviewAdvisoryRequest = {},
): Promise<AdvisoryResponse> {
  const { data } = await apiClient.post<AdvisoryResponse>(
    `/api/advisories/${advisoryId}/reject`,
    review,
  )
  return data
}
