import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { DistrictForecast } from '@/types/dto/weather'

async function getForecast(district: string): Promise<DistrictForecast> {
  const { data } = await apiClient.get<DistrictForecast>(
    `/api/weather/${encodeURIComponent(district)}`,
  )
  return data
}

/**
 * The forecast for a district. The server caches each district for half an hour, so there is no
 * point asking more often than every quarter hour; a failed fetch isn't retried (the card simply
 * says the weather isn't available).
 */
export function useDistrictForecast(district: string | null | undefined) {
  return useQuery({
    queryKey: ['weather', district],
    queryFn: () => getForecast(district!),
    enabled: Boolean(district),
    staleTime: 15 * 60 * 1000,
    retry: false,
  })
}
