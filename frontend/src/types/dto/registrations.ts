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

  // Rejected applications only (GET /api/registrations/rejected)
  rejectionReason?: string | null
  /** From the audit log; null if the rejection wasn't logged. */
  rejectedAt?: string | null
}

export interface RejectRegistrationRequest {
  reason: string
}
