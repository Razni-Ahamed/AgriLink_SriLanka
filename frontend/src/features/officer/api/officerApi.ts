import { apiClient } from '@/lib/apiClient'
import type { OfficerMetricsResponse } from '@/types/dto/officer'

export async function getOfficerMetrics(): Promise<OfficerMetricsResponse> {
  const { data } = await apiClient.get<OfficerMetricsResponse>('/api/officer/metrics')
  return data
}
