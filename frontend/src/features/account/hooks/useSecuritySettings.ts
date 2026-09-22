import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as securityApi from '../api/securityApi'
import type { CreateChangeRequestRequest, UpdatePhoneRequest } from '../api/securityApi'

const securityKey = ['account', 'security'] as const

export function useSecuritySettings() {
  return useQuery({ queryKey: securityKey, queryFn: securityApi.getSecuritySettings })
}

export function useVerifyPassword() {
  return useMutation({ mutationFn: securityApi.verifyPassword })
}

export function useUpdatePhone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: UpdatePhoneRequest) => securityApi.updatePhone(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: securityKey }),
  })
}

export function useCreateChangeRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ request, isAdmin }: { request: CreateChangeRequestRequest; isAdmin: boolean }) =>
      securityApi.createChangeRequest(request, isAdmin),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: securityKey }),
  })
}

export function useWithdrawChangeRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (requestId: number) => securityApi.withdrawChangeRequest(requestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: securityKey }),
  })
}
