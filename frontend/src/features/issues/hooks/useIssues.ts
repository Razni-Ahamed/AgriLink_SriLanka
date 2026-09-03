import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as issuesApi from '../api/issuesApi'
import type { CreateCropIssueRequest } from '@/types/dto/issues'

export function useMyIssues() {
  return useQuery({
    queryKey: ['issues', 'mine'],
    queryFn: issuesApi.getMyIssues,
  })
}

export function usePendingIssues() {
  return useQuery({
    queryKey: ['issues', 'pending'],
    queryFn: issuesApi.getPendingIssues,
  })
}

export function useCreateIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateCropIssueRequest) => issuesApi.createIssue(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['issues'] }),
  })
}
