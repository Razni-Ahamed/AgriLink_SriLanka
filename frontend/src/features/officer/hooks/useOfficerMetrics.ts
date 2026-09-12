import { useQuery } from '@tanstack/react-query'
import * as officerApi from '../api/officerApi'

export function useOfficerMetrics() {
  return useQuery({
    queryKey: ['officer', 'metrics'] as const,
    queryFn: officerApi.getOfficerMetrics,
  })
}
