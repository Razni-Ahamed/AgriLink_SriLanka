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

  farmerName: string
  farmerPhone?: string | null
  farmerEmail: string
  farmerDistrict: string
  /** Public https URL; null shows the default Farmer avatar. */
  farmerPhotoUrl?: string | null

  buyerName: string
  buyerBusinessName: string
  /** Null for a Buyer account created by Admin without a business phone on file. */
  buyerPhone?: string | null
  buyerEmail: string
  buyerDistrict: string
  /** Public https URL; null shows the default Buyer avatar. */
  buyerPhotoUrl?: string | null

  cropType: string
  pricePerUnit: number
  harvestLocation: string
}
