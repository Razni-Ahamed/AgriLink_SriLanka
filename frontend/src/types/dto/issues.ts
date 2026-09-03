export type IssueSeverity = 'Low' | 'Medium' | 'High'
export type IssueStatus = 'Pending' | 'AwaitingReview' | 'Resolved' | 'Rejected'

export interface CreateCropIssueRequest {
  cropId: number
  title: string
  description: string
  severity: IssueSeverity
}

export interface CropIssueResponse {
  issueId: number
  cropId: number
  title: string
  description: string
  severity: string
  status: string
  createdAt: string
}
