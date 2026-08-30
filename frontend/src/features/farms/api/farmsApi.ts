import { apiClient } from '@/lib/apiClient'
import type {
  CreateFarmRequest,
  CreateFieldRequest,
  FarmDto,
  FieldDto,
  UpdateFarmRequest,
} from '@/types/dto/farms'

export async function getFarms(): Promise<FarmDto[]> {
  const { data } = await apiClient.get<FarmDto[]>('/api/farms')
  return data
}

export async function createFarm(request: CreateFarmRequest): Promise<FarmDto> {
  const { data } = await apiClient.post<FarmDto>('/api/farms', request)
  return data
}

export async function updateFarm(farmId: number, request: UpdateFarmRequest): Promise<FarmDto> {
  const { data } = await apiClient.put<FarmDto>(`/api/farms/${farmId}`, request)
  return data
}

export async function deleteFarm(farmId: number): Promise<void> {
  await apiClient.delete(`/api/farms/${farmId}`)
}

export async function getFields(farmId: number): Promise<FieldDto[]> {
  const { data } = await apiClient.get<FieldDto[]>(`/api/farms/${farmId}/fields`)
  return data
}

export async function createField(farmId: number, request: CreateFieldRequest): Promise<FieldDto> {
  const { data } = await apiClient.post<FieldDto>(`/api/farms/${farmId}/fields`, request)
  return data
}
