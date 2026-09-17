export interface PendingRegistrationResponse {
  userId: number
  fullName: string
  email: string
  role: 'Farmer' | 'Buyer'
  district: string
  nic?: string
  createdAt: string

  // Farmer-only
  fieldPlotNumber?: string
  phoneNumber?: string

  // Buyer-only
  businessRegistrationNumber?: string
  businessPhone?: string
  legalBusinessName?: string
}

export interface RejectRegistrationRequest {
  reason: string
}
