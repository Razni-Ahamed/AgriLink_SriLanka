export interface CreateUserRequest {
  fullName: string
  email: string
  password: string
  /** "Officer" or "Buyer" */
  role: 'Officer' | 'Buyer'
  district: string
  /** Required when role is "Officer" */
  department?: string
  /** Required when role is "Buyer" */
  businessName?: string
}

export interface CreateUserResponse {
  userId: number
  fullName: string
  email: string
  role: string
}

export interface AdminMetricsResponse {
  totalUsers: number
  totalFarms: number
  totalCrops: number
  issuesReported: number
  issuesResolved: number
  harvestVolumeSoldThisMonth: number
}
