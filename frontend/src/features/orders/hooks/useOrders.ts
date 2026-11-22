import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ordersApi from '../api/ordersApi'

const ordersKey = ['orders'] as const
const orderKey = (orderId: number) => ['orders', 'detail', orderId] as const

/** One page of the caller's orders; under ['orders'], so completing or cancelling refreshes it. */
export function useOrdersPage(page: number) {
  return useQuery({
    queryKey: ['orders', 'mine', page] as const,
    queryFn: () => ordersApi.getMyOrdersPage(page),
    placeholderData: keepPreviousData,
  })
}

export function useOrder(orderId: number) {
  return useQuery({
    queryKey: orderKey(orderId),
    queryFn: () => ordersApi.getOrder(orderId),
    enabled: Number.isFinite(orderId),
  })
}

/** Complete or cancel a confirmed order; cancelling puts the quantity back on the listing. */
export function useOrderTransition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, action }: { orderId: number; action: 'complete' | 'cancel' }) =>
      action === 'complete' ? ordersApi.completeOrder(orderId) : ordersApi.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersKey })
      queryClient.invalidateQueries({ queryKey: ['harvests'] })
    },
  })
}
