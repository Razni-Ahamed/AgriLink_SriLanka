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

  // Who sent it — no phone/email here (unlike OrderResponse): a request isn't a deal yet, so
  // the buyer's direct contact details stay withheld until the farmer accepts it.
  buyerName: string
  buyerBusinessName: string
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
