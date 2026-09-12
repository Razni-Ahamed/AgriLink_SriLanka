import { apiClient } from '@/lib/apiClient'
import type { CreateCropIssueRequest, CropIssueResponse } from '@/types/dto/issues'

export async function createIssue(request: CreateCropIssueRequest): Promise<CropIssueResponse> {
  const { data } = await apiClient.post<CropIssueResponse>('/api/issues', request)
  return data
}

export async function getMyIssues(): Promise<CropIssueResponse[]> {
  const { data } = await apiClient.get<CropIssueResponse[]>('/api/issues/mine')
  return data
}

export async function getPendingIssues(): Promise<CropIssueResponse[]> {
  const { data } = await apiClient.get<CropIssueResponse[]>('/api/issues/pending')
  return data
}

/** Every issue ever reported, any status — Admin-only. */
export async function getAllIssues(): Promise<CropIssueResponse[]> {
  const { data } = await apiClient.get<CropIssueResponse[]>('/api/issues')
  return data
}

/** Issues the calling officer has personally reviewed, most recently reviewed first — Officer-only. */
export async function getReviewedIssues(): Promise<CropIssueResponse[]> {
  const { data } = await apiClient.get<CropIssueResponse[]>('/api/issues/reviewed')
  return data
}
