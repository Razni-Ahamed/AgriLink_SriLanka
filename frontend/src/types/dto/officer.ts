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
}
