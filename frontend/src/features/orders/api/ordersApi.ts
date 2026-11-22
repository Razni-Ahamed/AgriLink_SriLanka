import { apiClient } from '@/lib/apiClient'
import type { OrderResponse } from '@/types/dto/orders'
import type { PagedResponse } from '@/types/dto/paging'

/** One page of the caller's orders, newest first, with the total count. */
export async function getMyOrdersPage(
  page = 1,
  pageSize = 24,
): Promise<PagedResponse<OrderResponse>> {
  const { data } = await apiClient.get<PagedResponse<OrderResponse>>('/api/orders/mine', {
    params: { page, pageSize },
  })
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
