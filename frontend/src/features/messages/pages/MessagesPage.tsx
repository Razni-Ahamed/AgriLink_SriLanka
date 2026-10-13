import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChatsCircle } from '@phosphor-icons/react'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { ChatThread } from '../components/ChatThread'
import { ConversationList } from '../components/ConversationList'
import { useConversations } from '../hooks/useConversations'

/**
 * The chat list beside the open chat on wide screens; on a phone, one or the other. The height
 * keeps the page itself from scrolling, so only the messages scroll (the bottom tab bar is
 * below `xl`).
 */
export function MessagesPage() {
  const { t } = useTranslation('messages')
  const { conversationId } = useParams<{ conversationId: string }>()
  const selectedId = conversationId ? Number(conversationId) : undefined
  const hasSelection = selectedId !== undefined
  const { data, isLoading, isError } = useConversations()
  const conversations = data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className={cn(hasSelection && 'hidden lg:block')}>
        <h1 className="font-display text-2xl text-text-primary">{t('title')}</h1>
        <p className="text-sm text-text-secondary">{t('subtitle')}</p>
      </div>

      <div className="grid h-[calc(100dvh-12rem)] min-h-[26rem] grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr] xl:h-[calc(100dvh-12.5rem)]">
        <Card className={cn('min-h-0 overflow-y-auto p-2', hasSelection && 'hidden lg:block')}>
          {isLoading && (
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16" />
              ))}
            </div>
          )}
          {isError && <p className="p-4 text-sm text-state-danger">{t('list.loadError')}</p>}
          {!isLoading && !isError && conversations.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
              <IconBadge tone="forest">
                <ChatsCircle size={20} weight="duotone" />
              </IconBadge>
              <p className="text-sm text-text-primary">{t('list.empty')}</p>
              <p className="max-w-xs text-sm text-text-secondary">{t('list.emptyHint')}</p>
            </div>
          )}
          {conversations.length > 0 && <ConversationList conversations={conversations} selectedId={selectedId} />}
        </Card>

        <Card className={cn('min-h-0 overflow-hidden p-0', !hasSelection && 'hidden lg:block')}>
          {selectedId ? (
            <ChatThread key={selectedId} conversationId={selectedId} backTo="/messages" backLabel={t('thread.back')} />
          ) : (
            <p className="flex h-full items-center justify-center p-6 text-sm text-text-secondary">
              {t('thread.selectPrompt')}
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
