import { apiClient } from '@/lib/apiClient'
import type {
  CreateHarvestListingRequest,
  HarvestFilters,
  HarvestListingResponse,
  UpdateHarvestListingRequest,
} from '@/types/dto/harvests'

export async function getHarvests(filters: HarvestFilters = {}): Promise<HarvestListingResponse[]> {
  const { data } = await apiClient.get<HarvestListingResponse[]>('/api/harvests', {
    params: {
      cropType: filters.cropType || undefined,
      district: filters.district || undefined,
    },
  })
  return data
}

/** The logged-in farmer's own listings, every status included (GET /api/harvests only returns Active ones). */
export async function getMyHarvests(): Promise<HarvestListingResponse[]> {
  const { data } = await apiClient.get<HarvestListingResponse[]>('/api/harvests/mine')
  return data
}

export async function getHarvest(harvestId: number): Promise<HarvestListingResponse> {
  const { data } = await apiClient.get<HarvestListingResponse>(`/api/harvests/${harvestId}`)
  return data
}

export async function createHarvest(
  request: CreateHarvestListingRequest,
): Promise<HarvestListingResponse> {
  const { data } = await apiClient.post<HarvestListingResponse>('/api/harvests', request)
  return data
}

export async function updateHarvest(
  harvestId: number,
  request: UpdateHarvestListingRequest,
): Promise<HarvestListingResponse> {
  const { data } = await apiClient.put<HarvestListingResponse>(
    `/api/harvests/${harvestId}`,
    request,
  )
  return data
}
