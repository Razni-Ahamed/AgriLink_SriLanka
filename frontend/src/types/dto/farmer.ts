/** GET /api/farmer/overview: what needs the farmer's attention, for their home page. */
export interface FarmerOverviewResponse {
  /** Crop problems still waiting for an officer. */
  openIssues: number
  activeListings: number
  /** Buyers' requests not yet accepted or declined. */
  pendingRequests: number
  /** Confirmed orders not yet completed or cancelled. */
  ordersInProgress: number
  /** The most recently approved advice; null when there is none. */
  latestAdvice: {
    advisoryId: number
    issueId: number
    issueTitle: string
    cropType: string
    reviewedAt: string
  } | null
}
