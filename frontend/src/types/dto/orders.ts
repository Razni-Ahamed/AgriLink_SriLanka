export type OrderStatus = 'Confirmed' | 'Completed' | 'Cancelled'

export interface OrderResponse {
  orderId: number
  requestId: number
  farmerProfileId: number
  buyerProfileId: number
  totalQuantity: number
  totalAmount: number
  status: OrderStatus
  orderDate: string
  completedAt?: string
}
