import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { FarmerOverviewResponse } from '@/types/dto/farmer'

async function getFarmerOverview(): Promise<FarmerOverviewResponse> {
  const { data } = await apiClient.get<FarmerOverviewResponse>('/api/farmer/overview')
  return data
}

/** Exact counts for the farmer's home page (one request, not one per list). */
export function useFarmerOverview() {
  return useQuery({ queryKey: ['farmer', 'overview'], queryFn: getFarmerOverview })
}
