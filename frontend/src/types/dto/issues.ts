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
  district: string
  /** Reporting farmer's name — populated on Pending Issues and All Issues; blank on My Issues. */
  reporterName: string
  title: string
  description: string
  severity: IssueSeverity
  status: IssueStatus
  createdAt: string
  /** Latest advisory for this issue; null until the AI pipeline has produced one. */
  advisoryId: number | null
  /** When the latest advisory was reviewed — null while still in the Draft queue. */
  reviewedAt?: string
  /** The reviewing officer's own note on the latest advisory, if they left one. */
  reviewNote?: string
}
