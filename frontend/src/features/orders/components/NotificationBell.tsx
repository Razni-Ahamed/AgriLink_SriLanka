import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Bell } from '@/components/ui/icons'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../hooks/useNotifications'

const POLL_INTERVAL_MS = 30_000
const MAX_VISIBLE = 6

export function NotificationBell() {
  const [isOpen, setOpen] = useState(false)
  const { data: notifications, isLoading } = useNotifications({
    refetchInterval: POLL_INTERVAL_MS,
  })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unread = (notifications ?? []).filter((notification) => !notification.isRead)
  const recent = (notifications ?? []).slice(0, MAX_VISIBLE)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((open) => !open)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-brand-forest hover:bg-brand-forest/10"
      >
        <Bell size={20} weight="duotone" />
        {unread.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-terracotta px-1 text-[10px] font-semibold text-bg-surface">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -12, x: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-brand-forest/10 bg-bg-surface/90 shadow-lg backdrop-blur-md"
            >
              <div className="flex items-center justify-between border-b border-brand-forest/10 px-4 py-3">
                <h3 className="font-display text-sm text-text-primary">Notifications</h3>
                {unread.length > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllRead.mutate(unread.map((n) => n.notificationId))}
                    disabled={markAllRead.isPending}
                    className="text-xs font-medium text-brand-forest hover:underline disabled:opacity-50"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {isLoading && (
                  <div className="flex justify-center py-6">
                    <Spinner size="sm" />
                  </div>
                )}

                {!isLoading && recent.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-text-secondary">
                    You're all caught up.
                  </p>
                )}

                {recent.map((notification) => (
                  <button
                    key={notification.notificationId}
                    type="button"
                    onClick={() => {
                      if (!notification.isRead) {
                        markRead.mutate(notification.notificationId)
                      }
                    }}
                    className="flex w-full flex-col gap-1 border-b border-brand-forest/5 px-4 py-3 text-left last:border-0 hover:bg-brand-forest/5"
                  >
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-harvest" />
                      )}
                      <p className="text-sm font-medium text-text-primary">{notification.title}</p>
                    </div>
                    <p className="line-clamp-2 text-xs text-text-secondary">
                      {notification.message}
                    </p>
                    <p className="text-[11px] text-text-secondary/70">
                      {formatDate(notification.createdAt)}
                    </p>
                  </button>
                ))}
              </div>

              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="block border-t border-brand-forest/10 px-4 py-2.5 text-center text-xs font-medium text-brand-forest hover:bg-brand-forest/5"
              >
                View all
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
