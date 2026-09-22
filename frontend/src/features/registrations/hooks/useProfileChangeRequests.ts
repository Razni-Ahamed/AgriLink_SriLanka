import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as profileChangeRequestsApi from '../api/profileChangeRequestsApi'

export function usePendingChangeRequests(page: number) {
  return useQuery({
    queryKey: ['profile-change-requests', 'pending', page],
    queryFn: () => profileChangeRequestsApi.getPendingChangeRequests(page),
    placeholderData: keepPreviousData,
  })
}

export function useApproveChangeRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, currentPassword }: { requestId: number; currentPassword: string }) =>
      profileChangeRequestsApi.approveChangeRequest(requestId, currentPassword),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile-change-requests'] }),
  })
}

export function useRejectChangeRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: number; reason: string }) =>
      profileChangeRequestsApi.rejectChangeRequest(requestId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile-change-requests'] }),
  })
}
