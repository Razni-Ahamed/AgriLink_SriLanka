import { apiClient } from '@/lib/apiClient'
import type { NotificationResponse, SendNotificationRequest } from '@/types/dto/notifications'
import type { PagedResponse } from '@/types/dto/paging'

export async function getMyNotifications(
  page: number,
  pageSize?: number,
): Promise<PagedResponse<NotificationResponse>> {
  const { data } = await apiClient.get<PagedResponse<NotificationResponse>>('/api/notifications/mine', {
    params: { page, pageSize },
  })
  return data
}

export interface UnreadCountResponse {
  count: number
}

export async function getUnreadNotificationCount(): Promise<UnreadCountResponse> {
  const { data } = await apiClient.get<UnreadCountResponse>('/api/notifications/unread-count')
  return data
}

export async function markNotificationRead(notificationId: number): Promise<NotificationResponse> {
  const { data } = await apiClient.put<NotificationResponse>(
    `/api/notifications/${notificationId}/read`,
  )
  return data
}

/** Marks every one of the caller's own unread notifications as read in a single request. */
export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.put('/api/notifications/read-all')
}

export async function sendNotification(request: SendNotificationRequest): Promise<void> {
  await apiClient.post('/api/notifications/send', request)
}
