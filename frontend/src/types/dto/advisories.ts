import type { IssueSeverity, IssueStatus } from './issues'

export type AdvisoryStatus = 'Draft' | 'Approved' | 'Rejected'
export type RiskLevel = 'Low' | 'Medium' | 'High'

export interface AdvisoryResponse {
  advisoryId: number
  issueId: number
  issueTitle: string
  status: AdvisoryStatus
  riskLevel: RiskLevel
  recommendation: string
  confidenceScore: number
  requiresApproval: boolean
  reviewedByFK?: number
  reviewedByName?: string
  reviewedAt?: string

  // Full issue context, so a reviewer sees what was reported and by whom on this same panel.
  issueDescription: string
  issueSeverity: IssueSeverity
  issueStatus: IssueStatus
  issueCreatedAt: string
  cropType: string
  variety: string
  district: string
  reporterName: string
}
