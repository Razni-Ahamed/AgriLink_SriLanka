import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as advisoriesApi from '../api/advisoriesApi'

export function useAdvisory(advisoryId: number) {
  return useQuery({
    queryKey: ['advisories', 'detail', advisoryId],
    queryFn: () => advisoriesApi.getAdvisory(advisoryId),
    enabled: Number.isFinite(advisoryId),
  })
}

export function useApproveAdvisory(advisoryId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (note?: string) => advisoriesApi.approveAdvisory(advisoryId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisories', 'detail', advisoryId] })
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['officer', 'metrics'] })
    },
  })
}

export function useRejectAdvisory(advisoryId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (note?: string) => advisoriesApi.rejectAdvisory(advisoryId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisories', 'detail', advisoryId] })
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['officer', 'metrics'] })
    },
  })
}
