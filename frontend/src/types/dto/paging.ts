/** Mirrors the backend's Common/PagedResponse.cs envelope every paged list endpoint returns. */
export interface PagedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}
