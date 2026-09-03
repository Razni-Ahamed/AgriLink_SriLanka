import { apiClient } from '@/lib/apiClient'
import type { NotificationResponse, SendNotificationRequest } from '@/types/dto/notifications'

export async function getMyNotifications(): Promise<NotificationResponse[]> {
  const { data } = await apiClient.get<NotificationResponse[]>('/api/notifications/mine')
  return data
}

export async function markNotificationRead(notificationId: number): Promise<NotificationResponse> {
  const { data } = await apiClient.put<NotificationResponse>(
    `/api/notifications/${notificationId}/read`,
  )
  return data
}

export async function sendNotification(request: SendNotificationRequest): Promise<void> {
  await apiClient.post('/api/notifications/send', request)
}
