import { apiClient } from '@/lib/apiClient'
import type { CreateCropIssueRequest, CropIssueResponse } from '@/types/dto/issues'

export async function createIssue({
  photo,
  ...fields
}: CreateCropIssueRequest): Promise<CropIssueResponse> {
  if (!photo) {
    const { data } = await apiClient.post<CropIssueResponse>('/api/issues', fields)
    return data
  }

  // Multipart only when there is a photo; axios sets the boundary header for FormData itself.
  const form = new FormData()
  form.append('cropId', String(fields.cropId))
  form.append('title', fields.title)
  form.append('description', fields.description)
  form.append('severity', fields.severity)
  form.append('photo', photo, photo.name)
  const { data } = await apiClient.post<CropIssueResponse>('/api/issues/with-photo', form)
  return data
}

/** Loads a photo attached to an issue. Photo URLs are authenticated API paths, so they cannot go
 *  straight into an <img src>; the bytes are fetched with the signed-in user's token instead. */
export async function getIssuePhoto(url: string, signal?: AbortSignal): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(url, { responseType: 'blob', signal })
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
