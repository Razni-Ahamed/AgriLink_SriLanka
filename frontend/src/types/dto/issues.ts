export type IssueSeverity = 'Low' | 'Medium' | 'High'
export type IssueStatus = 'Pending' | 'AwaitingReview' | 'Resolved' | 'Rejected'

export interface CropIssueResponse {
  issueId: number
  cropId: number
  title: string
  description: string
  severity: IssueSeverity
  status: IssueStatus
  createdAt: string
  /**
   * The most recent advisory generated for this issue, if any. Backend addition
   * (see IssuesController.ToResponse) — the AI pipeline always creates a draft
   * advisory synchronously on issue creation, so this is set as soon as the
   * issue exists.
   */
  advisoryId: number | null
}

export interface CreateCropIssueRequest {
  cropId: number
  title: string
  description: string
  severity: IssueSeverity
}
