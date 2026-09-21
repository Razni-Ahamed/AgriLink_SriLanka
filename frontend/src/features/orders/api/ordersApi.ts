import { apiClient } from '@/lib/apiClient'
import type { OrderResponse } from '@/types/dto/orders'

export async function getMyOrders(): Promise<OrderResponse[]> {
  const { data } = await apiClient.get<OrderResponse[]>('/api/orders/mine')
  return data
}

export async function getOrder(orderId: number): Promise<OrderResponse> {
  const { data } = await apiClient.get<OrderResponse>(`/api/orders/${orderId}`)
  return data
}

export async function completeOrder(orderId: number): Promise<OrderResponse> {
  const { data } = await apiClient.post<OrderResponse>(`/api/orders/${orderId}/complete`)
  return data
}

export async function cancelOrder(orderId: number): Promise<OrderResponse> {
  const { data } = await apiClient.post<OrderResponse>(`/api/orders/${orderId}/cancel`)
  return data
}
