import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReviewAdvisoryRequest } from '@/types/dto/advisories'
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
    mutationFn: (review: ReviewAdvisoryRequest) =>
      advisoriesApi.approveAdvisory(advisoryId, review),
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
    mutationFn: (review: ReviewAdvisoryRequest) => advisoriesApi.rejectAdvisory(advisoryId, review),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisories', 'detail', advisoryId] })
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['officer', 'metrics'] })
    },
  })
}
