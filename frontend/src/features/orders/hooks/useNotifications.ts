import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as notificationsApi from '../api/notificationsApi'

const notificationsKey = ['notifications'] as const

export function useNotifications(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: notificationsKey,
    queryFn: notificationsApi.getMyNotifications,
    refetchInterval: options?.refetchInterval,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: number) => notificationsApi.markNotificationRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
  })
}

// The backend only exposes a per-notification PUT /{id}/read — there's no bulk
// "mark all read" route — so "mark all" is composed client-side from that.
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (unreadIds: number[]) => {
      await Promise.all(unreadIds.map((id) => notificationsApi.markNotificationRead(id)))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
  })
}
