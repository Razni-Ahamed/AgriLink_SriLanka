import { useQuery } from '@tanstack/react-query'
import * as ordersApi from '../api/ordersApi'

const ordersKey = ['orders'] as const
const orderKey = (orderId: number) => ['orders', 'detail', orderId] as const

export function useOrders() {
  return useQuery({ queryKey: ordersKey, queryFn: ordersApi.getMyOrders })
}

export function useOrder(orderId: number) {
  return useQuery({
    queryKey: orderKey(orderId),
    queryFn: () => ordersApi.getOrder(orderId),
    enabled: Number.isFinite(orderId),
  })
}
