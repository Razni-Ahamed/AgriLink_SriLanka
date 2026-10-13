import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { cn } from '@/lib/utils'
import type { ConversationSummary } from '@/types/dto/conversations'
import { useChatSubjectLabel, useCounterpartLabel } from '../lib/chatLabels'
import { formatListTime } from '../lib/chatTime'

const KIND_KEY = { Deal: 'kind.Deal', Advice: 'kind.Advice' } as const

interface ConversationListProps {
  conversations: ConversationSummary[]
  selectedId?: number
}

export function ConversationList({ conversations, selectedId }: ConversationListProps) {
  const { t } = useTranslation('messages')
  const counterpartLabel = useCounterpartLabel()
  const subjectLabel = useChatSubjectLabel()

  return (
    <ul aria-label={t('list.label')} className="flex flex-col">
      {conversations.map((chat) => {
        const selected = chat.conversationId === selectedId
        const name = counterpartLabel(chat)
        return (
          <li key={chat.conversationId}>
            <Link
              to={`/messages/${chat.conversationId}`}
              aria-current={selected ? 'page' : undefined}
              className={cn(
                'flex items-start gap-3 rounded-xl px-3 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-forest/60',
                selected ? 'bg-brand-forest/10' : 'hover:bg-brand-forest/5',
              )}
            >
              <UserAvatar photoUrl={chat.counterpartPhotoUrl} role={chat.counterpartRole} name={name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cn('truncate text-sm text-text-primary', chat.unreadCount > 0 && 'font-semibold')}>
                    {name}
                  </p>
                  {chat.lastMessageAt && (
                    <span className="shrink-0 text-[11px] text-text-secondary">{formatListTime(chat.lastMessageAt)}</span>
                  )}
                </div>
                <p className="truncate text-xs text-brand-forest">
                  {t(KIND_KEY[chat.kind])} · {subjectLabel(chat)}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('truncate text-xs', chat.unreadCount > 0 ? 'text-text-primary' : 'text-text-secondary')}>
                    {chat.lastMessagePreview &&
                      (chat.lastMessageIsMine ? t('list.you', { text: chat.lastMessagePreview }) : chat.lastMessagePreview)}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span
                      className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-terracotta px-1.5 text-[11px] font-semibold text-bg-surface"
                      aria-label={t('list.unread', { count: chat.unreadCount })}
                    >
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
