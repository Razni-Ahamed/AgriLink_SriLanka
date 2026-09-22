import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as notificationsApi from '../api/notificationsApi'

// Shared prefix so a mutation can invalidate every page (and the unread count) in one call.
const notificationsKey = ['notifications'] as const
const unreadCountKey = ['notifications', 'unread-count'] as const

export function useNotifications(
  page: number,
  options?: { pageSize?: number; refetchInterval?: number },
) {
  return useQuery({
    queryKey: [...notificationsKey, 'mine', page, options?.pageSize ?? 'default'],
    queryFn: () => notificationsApi.getMyNotifications(page, options?.pageSize),
    placeholderData: keepPreviousData,
    refetchInterval: options?.refetchInterval,
  })
}

/** Backs the header bell's badge — a single count instead of downloading every notification. */
export function useUnreadNotificationCount(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: unreadCountKey,
    queryFn: notificationsApi.getUnreadNotificationCount,
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

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
  })
}
