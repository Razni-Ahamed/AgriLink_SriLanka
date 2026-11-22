import { apiClient } from '@/lib/apiClient'
import type {
  CreateHarvestListingRequest,
  HarvestFilters,
  HarvestListingResponse,
  PriceGuideResponse,
  UpdateHarvestListingRequest,
} from '@/types/dto/harvests'
import type { QuantityUnit } from '@/lib/units'
import type { PagedResponse } from '@/types/dto/paging'

function filterParams(filters: HarvestFilters) {
  return {
    cropType: filters.cropType || undefined,
    // Comma-separated, as the API expects (axios would otherwise send cropTypes[]=…).
    cropTypes: filters.cropTypes?.length ? filters.cropTypes.join(',') : undefined,
    district: filters.district || undefined,
    search: filters.search || undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    sort: filters.sort || undefined,
  }
}

/** Every matching listing at once. Kept for callers that need the whole list; prefer getHarvestPage. */
export async function getHarvests(filters: HarvestFilters = {}): Promise<HarvestListingResponse[]> {
  const { data } = await apiClient.get<HarvestListingResponse[]>('/api/harvests', {
    params: filterParams(filters),
  })
  return data
}

/** One page of matching listings, with the total count — what the marketplace pages show. */
export async function getHarvestPage(
  filters: HarvestFilters = {},
  page = 1,
  pageSize = 24,
): Promise<PagedResponse<HarvestListingResponse>> {
  const { data } = await apiClient.get<PagedResponse<HarvestListingResponse>>('/api/harvests', {
    params: { ...filterParams(filters), page, pageSize },
  })
  return data
}

/** The logged-in farmer's own listings, every status included (GET /api/harvests only returns Active ones). */
export async function getMyHarvests(): Promise<HarvestListingResponse[]> {
  const { data } = await apiClient.get<HarvestListingResponse[]>('/api/harvests/mine')
  return data
}

/** Recent agreed prices for a crop, in a district and nationwide, to help price a new listing. */
export async function getPriceGuide(
  cropType: string,
  district?: string,
  unit: QuantityUnit = 'Kg',
): Promise<PriceGuideResponse> {
  const { data } = await apiClient.get<PriceGuideResponse>('/api/harvests/price-guide', {
    params: { cropType, district: district || undefined, unit },
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
