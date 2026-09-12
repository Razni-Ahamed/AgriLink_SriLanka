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
  /** The crop this issue is about, so neither the farmer nor the reviewing officer sees a bare id. */
  cropType: string
  variety: string
  title: string
  description: string
  severity: IssueSeverity
  status: IssueStatus
  createdAt: string
  /** Latest advisory for this issue; null until the AI pipeline has produced one. */
  advisoryId: number | null
}
