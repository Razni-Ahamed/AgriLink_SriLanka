export type CropStatus = 'Seeded' | 'Growing' | 'Harvested'

export interface CropDto {
  cropId: number
  fieldId: number
  cropType: string
  variety: string
  plantingDate: string
  expectedHarvestDate: string
  expectedQuantity: number
  status: string
}

/** A crop plus the field and farm it belongs to — what GET /api/crops/mine returns. */
export interface FarmerCropSummary {
  cropId: number
  cropType: string
  variety: string
  status: CropStatus
  plantingDate: string
  expectedHarvestDate: string
  expectedQuantity: number
  fieldId: number
  fieldName: string
  farmId: number
  farmName: string
  district: string
}

export interface CreateCropRequest {
  cropType: string
  variety: string
  plantingDate: string
  expectedHarvestDate: string
  expectedQuantity: number
}

export interface UpdateCropRequest {
  status: CropStatus
}
