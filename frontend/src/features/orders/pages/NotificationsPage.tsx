import { AnimatePresence, motion } from 'motion/react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatDate } from '@/lib/utils'
import { useMarkNotificationRead, useNotifications } from '../hooks/useNotifications'
import type { NotificationResponse } from '@/types/dto/notifications'

function NotificationRow({ notification }: { notification: NotificationResponse }) {
  const markRead = useMarkNotificationRead()

  return (
    <motion.div layout>
      <Card
        className={cn(
          'flex items-start justify-between gap-4 transition-colors',
          !notification.isRead && 'bg-brand-harvest/5',
        )}
      >
        <div className="flex items-start gap-3">
          <AnimatePresence>
            {!notification.isRead && (
              <motion.span
                initial={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-harvest"
              />
            )}
          </AnimatePresence>
          <div>
            <p className="font-medium text-text-primary">{notification.title}</p>
            <p className="text-sm text-text-secondary">{notification.message}</p>
            <p className="mt-1 text-xs text-text-secondary/70">
              {formatDate(notification.createdAt)}
            </p>
          </div>
        </div>

        {!notification.isRead && (
          <button
            type="button"
            onClick={() => markRead.mutate(notification.notificationId)}
            disabled={markRead.isPending}
            className="shrink-0 text-xs font-medium text-brand-forest hover:underline disabled:opacity-50"
          >
            Mark read
          </button>
        )}
      </Card>
    </motion.div>
  )
}

export function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text-primary">Notifications</h1>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      )}

      {!isLoading && notifications && notifications.length === 0 && (
        <p className="text-sm text-text-secondary">You don't have any notifications yet.</p>
      )}

      {!isLoading && notifications && notifications.length > 0 && (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {notifications.map((notification) => (
              <NotificationRow key={notification.notificationId} notification={notification} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
