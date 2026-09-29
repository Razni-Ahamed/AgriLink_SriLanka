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

/** The marketplace orders GET /api/harvests accepts. */
export type HarvestSort = 'newest' | 'priceAsc' | 'priceDesc' | 'quantityDesc' | 'freshest'

export interface HarvestFilters {
  cropType?: string
  district?: string
  /** Matches the crop, variety, collection point or district. */
  search?: string
  minPrice?: number
  maxPrice?: number
  sort?: HarvestSort
}
