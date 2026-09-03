export type AdvisoryStatus = 'Draft' | 'Approved' | 'Rejected'
export type RiskLevel = 'Low' | 'Medium' | 'High'

export interface AdvisoryResponse {
  advisoryId: number
  issueId: number
  issueTitle: string
  status: string
  riskLevel: string
  recommendation: string
  confidenceScore: number
  requiresApproval: boolean
  reviewedByFK?: number
  reviewedAt?: string
}
