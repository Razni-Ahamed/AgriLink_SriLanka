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
