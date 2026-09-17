import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RejectRegistrationRequest } from '@/types/dto/registrations'
import * as registrationsApi from '../api/registrationsApi'

export function usePendingRegistrations() {
  return useQuery({
    queryKey: ['registrations', 'pending'],
    queryFn: registrationsApi.getPendingRegistrations,
  })
}

// Approving/rejecting also changes what the Admin users table and metrics show (a Pending
// account becomes Active), so both are invalidated alongside the registrations queue itself.
export function useApproveRegistration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => registrationsApi.approveRegistration(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] })
    },
  })
}

export function useRejectRegistration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, request }: { userId: number; request: RejectRegistrationRequest }) =>
      registrationsApi.rejectRegistration(userId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] })
    },
  })
}
