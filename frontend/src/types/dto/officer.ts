/** The calling officer's own dashboard numbers — district/department-scoped equivalent of
 *  AdminMetricsResponse, which covers the whole platform instead of one officer. */
export interface OfficerMetricsResponse {
  district: string
  departmentName: string
  pendingInDistrict: number
  reviewedToday: number
  reviewedTotal: number
  approvedTotal: number
  rejectedTotal: number
  /** Issues in this district waiting longer than overdueAfterHours. */
  overdueInDistrict: number
  /** The district's longest current wait; null when nothing is waiting. */
  oldestPendingHours: number | null
  /** This officer's average time from AI draft to decision over the last 30 days. */
  averageReviewHours: number | null
  reviewsInAverage: number
  overdueAfterHours: number
}
