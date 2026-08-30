import { apiClient } from '@/lib/apiClient'
import type { CreateCropRequest, CropDto, UpdateCropRequest } from '@/types/dto/crops'

export async function plantCrop(fieldId: number, request: CreateCropRequest): Promise<CropDto> {
  const { data } = await apiClient.post<CropDto>(`/api/fields/${fieldId}/crops`, request)
  return data
}

export async function getCrop(cropId: number): Promise<CropDto> {
  const { data } = await apiClient.get<CropDto>(`/api/crops/${cropId}`)
  return data
}

export async function updateCrop(cropId: number, request: UpdateCropRequest): Promise<CropDto> {
  const { data } = await apiClient.put<CropDto>(`/api/crops/${cropId}`, request)
  return data
}
