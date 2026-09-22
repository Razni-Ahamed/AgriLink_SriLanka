import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as issuesApi from '../api/issuesApi'
import type { CreateCropIssueRequest } from '@/types/dto/issues'

// Every list hook keeps showing the current page's rows while the next page loads (instead of
// flashing to a loading state), and includes `page` in its key so each page caches separately —
// still all invalidated together by the shared ['issues'] prefix a mutation clears.

export function useMyIssues(page: number) {
  return useQuery({
    queryKey: ['issues', 'mine', page],
    queryFn: () => issuesApi.getMyIssues(page),
    placeholderData: keepPreviousData,
  })
}

export function usePendingIssues(page: number) {
  return useQuery({
    queryKey: ['issues', 'pending', page],
    queryFn: () => issuesApi.getPendingIssues(page),
    placeholderData: keepPreviousData,
  })
}

/** Admin's full oversight view — every issue ever reported, any status. */
export function useAllIssues(page: number) {
  return useQuery({
    queryKey: ['issues', 'all', page],
    queryFn: () => issuesApi.getAllIssues(page),
    placeholderData: keepPreviousData,
  })
}

/** The calling officer's own review history — issues they've personally approved or rejected. */
export function useReviewedIssues(page: number) {
  return useQuery({
    queryKey: ['issues', 'reviewed', page],
    queryFn: () => issuesApi.getReviewedIssues(page),
    placeholderData: keepPreviousData,
  })
}

export function useCreateIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateCropIssueRequest) => issuesApi.createIssue(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['issues'] }),
  })
}
