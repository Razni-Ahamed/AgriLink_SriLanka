import { apiClient } from '@/lib/apiClient'
import type {
  CreateCropRequest,
  CropDto,
  FarmerCropSummary,
  UpdateCropRequest,
} from '@/types/dto/crops'

export async function plantCrop(fieldId: number, request: CreateCropRequest): Promise<CropDto> {
  const { data } = await apiClient.post<CropDto>(`/api/fields/${fieldId}/crops`, request)
  return data
}

/** Every crop planted in one field. */
export async function getFieldCrops(fieldId: number): Promise<CropDto[]> {
  const { data } = await apiClient.get<CropDto[]>(`/api/fields/${fieldId}/crops`)
  return data
}

/** All of the logged-in farmer's crops, with the field and farm each belongs to. */
export async function getMyCrops(): Promise<FarmerCropSummary[]> {
  const { data } = await apiClient.get<FarmerCropSummary[]>('/api/crops/mine')
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
