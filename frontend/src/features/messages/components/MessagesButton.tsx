import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChatsCircle } from '@phosphor-icons/react'
import { useAuthStore } from '@/auth/authStore'
import { useOpenReportCount, useUnreadMessageCount } from '../hooks/useConversations'

/**
 * The header's chat button, beside the notification bell: unread messages for farmers, buyers and
 * officers; open chat reports for admins, who don't chat but review reported conversations.
 */
export function MessagesButton() {
  const { t } = useTranslation('messages')
  const role = useAuthStore((state) => state.role)
  const isAdmin = role === 'Admin'
  const { data: unread } = useUnreadMessageCount(role !== null && !isAdmin)
  const { data: openReports } = useOpenReportCount(isAdmin)

  if (!role) {
    return null
  }

  const count = (isAdmin ? openReports : unread) ?? 0
  const label = t(isAdmin ? 'header.openReports' : 'header.open')

  return (
    <Link
      to={isAdmin ? '/admin/reported-chats' : '/messages'}
      aria-label={count > 0 ? `${label}, ${t(isAdmin ? 'header.openCount' : 'header.unread', { count })}` : label}
      title={label}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl text-brand-forest outline-none hover:bg-brand-forest/10 focus-visible:ring-2 focus-visible:ring-brand-forest/60"
    >
      <ChatsCircle size={20} weight="duotone" />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-terracotta px-1 text-[10px] font-semibold text-bg-surface">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
