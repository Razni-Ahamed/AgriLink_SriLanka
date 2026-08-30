export interface FarmDto {
  farmId: number
  name: string
  district: string
  area: number
  createdAt: string
}

export interface FieldDto {
  fieldId: number
  farmId: number
  name: string
  area: number
}

export interface CreateFarmRequest {
  name: string
  district: string
  area: number
}

export interface UpdateFarmRequest {
  name: string
  district: string
  area: number
}

export interface CreateFieldRequest {
  name: string
  area: number
}
