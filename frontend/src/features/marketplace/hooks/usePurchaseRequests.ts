import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as purchaseRequestsApi from '../api/purchaseRequestsApi'
import type { CreatePurchaseRequestRequest, PurchaseRequestAction } from '@/types/dto/purchaseRequests'

const incomingRequestsKey = ['purchase-requests', 'mine'] as const

export function useCreatePurchaseRequest() {
  return useMutation({
    mutationFn: (request: CreatePurchaseRequestRequest) =>
      purchaseRequestsApi.createPurchaseRequest(request),
  })
}

export function useIncomingPurchaseRequests() {
  return useQuery({
    queryKey: incomingRequestsKey,
    queryFn: purchaseRequestsApi.getMyIncomingRequests,
  })
}

export function useRespondToPurchaseRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, action }: { requestId: number; action: PurchaseRequestAction }) =>
      purchaseRequestsApi.respondToRequest(requestId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incomingRequestsKey })
      queryClient.invalidateQueries({ queryKey: ['harvests'] })
    },
  })
}
