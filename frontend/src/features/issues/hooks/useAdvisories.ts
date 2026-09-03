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
    mutationFn: () => advisoriesApi.approveAdvisory(advisoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisories', 'detail', advisoryId] })
      queryClient.invalidateQueries({ queryKey: ['issues'] })
    },
  })
}

export function useRejectAdvisory(advisoryId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => advisoriesApi.rejectAdvisory(advisoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisories', 'detail', advisoryId] })
      queryClient.invalidateQueries({ queryKey: ['issues'] })
    },
  })
}
