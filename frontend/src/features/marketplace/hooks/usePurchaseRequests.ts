import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as purchaseRequestsApi from '../api/purchaseRequestsApi'
import type { CreatePurchaseRequestRequest, PurchaseRequestAction } from '@/types/dto/purchaseRequests'

const incomingRequestsKey = ['purchase-requests', 'mine'] as const
const sentRequestsKey = ['purchase-requests', 'sent'] as const

export function useCreatePurchaseRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreatePurchaseRequestRequest) =>
      purchaseRequestsApi.createPurchaseRequest(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sentRequestsKey }),
  })
}

export function useIncomingPurchaseRequests() {
  return useQuery({
    queryKey: incomingRequestsKey,
    queryFn: purchaseRequestsApi.getMyIncomingRequests,
  })
}

/** The logged-in buyer's own submitted requests — for the buyer-facing "My Requests" page. */
export function useSentPurchaseRequests() {
  return useQuery({
    queryKey: sentRequestsKey,
    queryFn: purchaseRequestsApi.getMySentRequests,
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
