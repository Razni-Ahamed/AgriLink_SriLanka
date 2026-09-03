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
