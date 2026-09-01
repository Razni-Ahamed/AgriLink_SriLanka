import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { useUiStore } from '@/lib/useUiStore'
import { PurchaseRequestCard } from '../components/PurchaseRequestCard'
import { useIncomingPurchaseRequests, useRespondToPurchaseRequest } from '../hooks/usePurchaseRequests'

export function MyPurchaseRequestsPage() {
  const { data: requests, isLoading } = useIncomingPurchaseRequests()
  const respond = useRespondToPurchaseRequest()
  const addToast = useUiStore((state) => state.addToast)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text-primary">Purchase Requests</h1>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      )}

      {!isLoading && requests && requests.length === 0 && (
        <p className="text-sm text-text-secondary">
          No one has requested to buy your listings yet.
        </p>
      )}

      {!isLoading && requests && requests.length > 0 && (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map((request) => (
            <StaggerList.Item key={request.requestId}>
              <PurchaseRequestCard
                request={request}
                isResponding={respond.isPending}
                onAccept={() =>
                  respond.mutate(
                    { requestId: request.requestId, action: 'accept' },
                    {
                      onSuccess: () =>
                        addToast({ type: 'success', message: 'Request accepted — order created.' }),
                      onError: () =>
                        addToast({ type: 'error', message: 'Could not accept the request.' }),
                    },
                  )
                }
                onDecline={() =>
                  respond.mutate(
                    { requestId: request.requestId, action: 'decline' },
                    {
                      onError: () =>
                        addToast({ type: 'error', message: 'Could not decline the request.' }),
                    },
                  )
                }
              />
            </StaggerList.Item>
          ))}
        </StaggerList>
      )}
    </div>
  )
}
