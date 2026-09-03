export interface NotificationResponse {
  notificationId: number
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export interface SendNotificationRequest {
  userId: number
  title: string
  message: string
}
