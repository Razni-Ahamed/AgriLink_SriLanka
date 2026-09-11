export type PurchaseRequestStatus = 'Pending' | 'Accepted' | 'Declined' | 'Cancelled'

export interface PurchaseRequestResponse {
  requestId: number
  harvestId: number
  buyerProfileId: number
  requestedQuantity: number
  message: string
  status: PurchaseRequestStatus
  createdAt: string
  cropType: string
  district: string
  pricePerUnit: number
}

export interface CreatePurchaseRequestRequest {
  harvestId: number
  requestedQuantity: number
  message?: string
}

export type PurchaseRequestAction = 'accept' | 'decline'

export interface RespondPurchaseRequestRequest {
  action: PurchaseRequestAction
}
