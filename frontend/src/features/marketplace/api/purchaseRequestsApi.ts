import { apiClient } from '@/lib/apiClient'
import type {
  CreatePurchaseRequestRequest,
  PurchaseRequestAction,
  PurchaseRequestResponse,
} from '@/types/dto/purchaseRequests'

export async function createPurchaseRequest(
  request: CreatePurchaseRequestRequest,
): Promise<PurchaseRequestResponse> {
  const { data } = await apiClient.post<PurchaseRequestResponse>('/api/purchase-requests', request)
  return data
}

/** Incoming purchase requests on the logged-in farmer's own listings. Farmer-only endpoint. */
export async function getMyIncomingRequests(): Promise<PurchaseRequestResponse[]> {
  const { data } = await apiClient.get<PurchaseRequestResponse[]>('/api/purchase-requests/mine')
  return data
}

/** The logged-in buyer's own submitted requests, across every listing, any status. Buyer-only endpoint. */
export async function getMySentRequests(): Promise<PurchaseRequestResponse[]> {
  const { data } = await apiClient.get<PurchaseRequestResponse[]>('/api/purchase-requests/sent')
  return data
}

export async function respondToRequest(
  requestId: number,
  action: PurchaseRequestAction,
): Promise<PurchaseRequestResponse> {
  const { data } = await apiClient.post<PurchaseRequestResponse>(
    `/api/purchase-requests/${requestId}/respond`,
    { action },
  )
  return data
}
