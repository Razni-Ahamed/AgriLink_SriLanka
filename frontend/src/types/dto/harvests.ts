export type HarvestStatus = 'Active' | 'Sold' | 'Cancelled'

export interface HarvestListingResponse {
  harvestId: number
  farmerProfileId: number
  cropId: number
  cropType: string
  variety: string
  quantity: number
  availableQuantity: number
  harvestDate: string
  pricePerUnit: number
  location: string
  district: string
  status: HarvestStatus
  createdAt: string
}

export interface CreateHarvestListingRequest {
  cropId: number
  quantity: number
  harvestDate: string
  pricePerUnit: number
  location: string
}

export interface UpdateHarvestListingRequest {
  status?: HarvestStatus
  pricePerUnit?: number
  location?: string
  harvestDate?: string
}

export interface HarvestFilters {
  cropType?: string
  district?: string
}
