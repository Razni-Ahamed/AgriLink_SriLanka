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

/** Admin's full oversight view — every issue ever reported, any status. */
export function useAllIssues() {
  return useQuery({
    queryKey: ['issues', 'all'],
    queryFn: issuesApi.getAllIssues,
  })
}

/** The calling officer's own review history — issues they've personally approved or rejected. */
export function useReviewedIssues() {
  return useQuery({
    queryKey: ['issues', 'reviewed'],
    queryFn: issuesApi.getReviewedIssues,
  })
}

export function useCreateIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateCropIssueRequest) => issuesApi.createIssue(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['issues'] }),
  })
}
