import { apiClient } from '@/lib/apiClient'
import type {
  CreateHarvestListingRequest,
  HarvestFilters,
  HarvestListingResponse,
  PriceGuideResponse,
  UpdateHarvestListingRequest,
} from '@/types/dto/harvests'

export async function getHarvests(filters: HarvestFilters = {}): Promise<HarvestListingResponse[]> {
  const { data } = await apiClient.get<HarvestListingResponse[]>('/api/harvests', {
    params: {
      cropType: filters.cropType || undefined,
      district: filters.district || undefined,
      search: filters.search || undefined,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      sort: filters.sort || undefined,
    },
  })
  return data
}

/** The logged-in farmer's own listings, every status included (GET /api/harvests only returns Active ones). */
export async function getMyHarvests(): Promise<HarvestListingResponse[]> {
  const { data } = await apiClient.get<HarvestListingResponse[]>('/api/harvests/mine')
  return data
}

/** Recent agreed prices for a crop, in a district and nationwide, to help price a new listing. */
export async function getPriceGuide(cropType: string, district?: string): Promise<PriceGuideResponse> {
  const { data } = await apiClient.get<PriceGuideResponse>('/api/harvests/price-guide', {
    params: { cropType, district: district || undefined },
  })
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
