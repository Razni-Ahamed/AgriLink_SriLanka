import { Fragment, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { ArrowLeft, Flag, LockKey, PaperPlaneRight, ShieldWarning } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { useAuthStore } from '@/auth/authStore'
import { cn, formatDate } from '@/lib/utils'
import type { ChatMessage, ConversationDetail } from '@/types/dto/conversations'
import { daysAgo, formatClockTime, isNewDay } from '../lib/chatTime'
import { useConversation, useMarkConversationRead, useMessages, useSendMessage } from '../hooks/useConversations'
import { useChatSubjectLabel, useCounterpartLabel } from '../lib/chatLabels'
import { ReportChatDialog } from './ReportChatDialog'

const MAX_MESSAGE = 1000
const KIND_KEY = { Deal: 'kind.Deal', Advice: 'kind.Advice' } as const
const ROLE_KEY = { Farmer: 'role.Farmer', Buyer: 'role.Buyer', Officer: 'role.Officer' } as const

interface ChatThreadProps {
  conversationId: number
  /** 'admin': an admin reading a reported chat — no composer, both sides named. */
  mode?: 'participant' | 'admin'
  /** Where "back" goes on a phone, where the list and the chat don't fit side by side. */
  backTo: string
  backLabel: string
}

export function ChatThread({ conversationId, mode = 'participant', backTo, backLabel }: ChatThreadProps) {
  const { t } = useTranslation('messages')
  const { data: chat, isLoading, isError } = useConversation(conversationId)
  const { data: page, isError: messagesFailed } = useMessages(conversationId)
  const markRead = useMarkConversationRead()
  const messages = page?.items ?? []

  // Everything from the other side up to the newest message is read once it's on screen.
  const lastFromOthers = messages.findLast((message) => !message.isMine)?.messageId ?? 0
  const lastMarked = useRef(0)
  const { mutate: markAsRead } = markRead
  useEffect(() => {
    if (mode === 'participant' && chat && lastFromOthers > lastMarked.current) {
      lastMarked.current = lastFromOthers
      markAsRead(conversationId)
    }
  }, [mode, chat, lastFromOthers, conversationId, markAsRead])

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <Skeleton className="h-14" />
        <Skeleton className="flex-1" />
      </div>
    )
  }

  if (isError || !chat) {
    return (
      <div className="flex h-full flex-col gap-3 p-6">
        <BackLink to={backTo} label={backLabel} />
        <p className="text-sm text-text-secondary">{t('thread.notFound')}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ThreadHeader chat={chat} mode={mode} backTo={backTo} backLabel={backLabel} />
      <MessageList chat={chat} messages={messages} hasOlder={page?.hasOlder ?? false} failed={messagesFailed} mode={mode} />
      {mode === 'admin' ? (
        <Notice icon={<ShieldWarning size={18} weight="duotone" />} text={t('thread.adminView')} />
      ) : chat.canSend ? (
        <Composer conversationId={conversationId} />
      ) : (
        <Notice icon={<LockKey size={18} weight="duotone" />} text={t('thread.closed')} />
      )}
    </div>
  )
}

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex w-fit items-center gap-1 text-sm text-text-secondary hover:text-brand-forest lg:hidden">
      <ArrowLeft size={14} />
      {label}
    </Link>
  )
}

function Notice({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <p className="flex items-center gap-2 border-t border-brand-forest/10 px-4 py-3 text-sm text-text-secondary">
      <span className="shrink-0 text-brand-forest">{icon}</span>
      {text}
    </p>
  )
}

function ThreadHeader({
  chat,
  mode,
  backTo,
  backLabel,
}: {
  chat: ConversationDetail
  mode: 'participant' | 'admin'
  backTo: string
  backLabel: string
}) {
  const { t } = useTranslation('messages')
  const role = useAuthStore((state) => state.role)
  const counterpartLabel = useCounterpartLabel()
  const subjectLabel = useChatSubjectLabel()
  const [reportOpen, setReportOpen] = useState(false)

  const name =
    mode === 'admin' && chat.participants
      ? t('reports.between', {
          farmer: chat.participants[0]?.name ?? '',
          other:
            chat.kind === 'Advice'
              ? t('thread.officersOfDistrict', { district: chat.district })
              : (chat.participants[1]?.name ?? ''),
        })
      : counterpartLabel(chat)
  const avatarRole = chat.counterpartRole || 'Farmer'

  let link: { to: string; label: string } | null = null
  if (chat.orderId) {
    link = { to: `/orders/${chat.orderId}`, label: t('thread.viewOrder') }
  } else if (chat.advisoryId) {
    link = { to: `/advisories/${chat.advisoryId}`, label: t('thread.viewAdvice') }
  } else if (chat.kind === 'Deal' && role !== 'Admin') {
    link = {
      to: role === 'Farmer' ? '/marketplace/requests' : '/marketplace/sent-requests',
      label: t('thread.viewRequest'),
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b border-brand-forest/10 p-4">
      <BackLink to={backTo} label={backLabel} />
      <div className="flex items-start gap-3">
        {mode === 'participant' && (
          <UserAvatar photoUrl={chat.counterpartPhotoUrl} role={avatarRole} name={name} size="md" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg text-text-primary">{name}</h2>
          {mode === 'participant' && chat.counterpartRole && (
            <p className="truncate text-xs text-text-secondary">
              {t(ROLE_KEY[chat.counterpartRole])}
              {chat.counterpartBusinessName && ` · ${chat.counterpartBusinessName}`}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={chat.kind === 'Deal' ? 'info' : 'success'} className="whitespace-nowrap">
              {t(KIND_KEY[chat.kind])}
            </Badge>
            <span className="truncate text-text-secondary">{subjectLabel(chat)}</span>
            {link && (
              <Link to={link.to} className="font-medium text-brand-forest hover:underline">
                {link.label}
              </Link>
            )}
          </div>
        </div>
        {mode === 'participant' &&
          (chat.reportedByMe ? (
            <span className="shrink-0 text-xs text-text-secondary">{t('report.already')}</span>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)} className="shrink-0">
              <Flag size={14} weight="duotone" />
              <span className="max-sm:sr-only">{t('report.open')}</span>
            </Button>
          ))}
      </div>
      {mode === 'participant' && chat.kind === 'Deal' && (
        <p className="text-xs text-text-secondary">{t('thread.safety')}</p>
      )}
      <ReportChatDialog conversationId={chat.conversationId} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  )
}

function MessageList({
  chat,
  messages,
  hasOlder,
  failed,
  mode,
}: {
  chat: ConversationDetail
  messages: ChatMessage[]
  hasOlder: boolean
  failed: boolean
  mode: 'participant' | 'admin'
}) {
  const { t } = useTranslation('messages')
  const scrollRef = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  const lastMessage = messages.at(-1)
  const lastId = lastMessage?.messageId ?? 0
  const lastIsMine = lastMessage?.isMine ?? false

  // Follow new messages, unless the reader has scrolled up to read older ones.
  useEffect(() => {
    const element = scrollRef.current
    if (element && (nearBottom.current || lastIsMine)) {
      element.scrollTop = element.scrollHeight
    }
  }, [lastId, lastIsMine])

  const lastMine = messages.findLast((message) => message.isMine)
  const seenId =
    lastMine && chat.counterpartLastReadMessageId != null && chat.counterpartLastReadMessageId >= lastMine.messageId
      ? lastMine.messageId
      : null
  // Name the sender when it isn't obvious: several officers can answer an advice chat, and an
  // admin reading a report sees both sides.
  const showSenders = mode === 'admin' || chat.kind === 'Advice'

  function dayLabel(value: string) {
    const days = daysAgo(value)
    return days === 0 ? t('thread.today') : days === 1 ? t('thread.yesterday') : formatDate(value)
  }

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => {
        const element = event.currentTarget
        nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80
      }}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
      role="log"
      aria-live="polite"
      aria-label={t('title')}
    >
      {failed && <p className="py-6 text-center text-sm text-state-danger">{t('errors.loadFailed')}</p>}
      {!failed && messages.length === 0 && (
        <p className="py-10 text-center text-sm text-text-secondary">{t('thread.noMessages')}</p>
      )}
      {hasOlder && <p className="pb-3 text-center text-xs text-text-secondary">{t('thread.olderHidden')}</p>}

      <ol className="flex flex-col gap-2">
        {messages.map((message, index) => {
          const right = mode === 'admin' ? message.senderRole !== 'Farmer' : message.isMine
          const previous = messages[index - 1]
          const newDay = isNewDay(previous?.createdAt, message.createdAt)
          const sameSenderAsPrevious = !newDay && previous?.senderUserId === message.senderUserId
          return (
            <Fragment key={message.messageId}>
              {newDay && (
                <li className="my-2 flex justify-center" aria-hidden="true">
                  <span className="rounded-full bg-brand-forest/5 px-3 py-0.5 text-[11px] text-text-secondary">
                    {dayLabel(message.createdAt)}
                  </span>
                </li>
              )}
              <li className={cn('flex flex-col', right ? 'items-end' : 'items-start')}>
                {showSenders && !message.isMine && !sameSenderAsPrevious && (
                  <p className="mb-0.5 px-1 text-[11px] font-medium text-brand-forest">
                    {message.senderName} · {t(ROLE_KEY[message.senderRole])}
                  </p>
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm sm:max-w-[70%]',
                    right
                      ? 'rounded-br-md bg-brand-forest text-bg-surface'
                      : 'rounded-bl-md border border-brand-forest/10 bg-bg-canvas text-text-primary',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p className={cn('mt-1 text-right text-[10px]', right ? 'text-bg-surface/75' : 'text-text-secondary')}>
                    <time dateTime={message.createdAt}>{formatClockTime(message.createdAt)}</time>
                  </p>
                </div>
                {message.messageId === seenId && (
                  <p className="mt-0.5 px-1 text-[11px] text-text-secondary">{t('thread.seen')}</p>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </div>
  )
}

function Composer({ conversationId }: { conversationId: number }) {
  const { t } = useTranslation('messages')
  const [text, setText] = useState('')
  const send = useSendMessage(conversationId)
  const trimmed = text.trim()

  function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!trimmed || send.isPending) {
      return
    }
    send.mutate(trimmed, { onSuccess: () => setText('') })
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Not while an input method (Sinhala or Tamil keyboards) is still composing a character.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  const status = isAxiosError(send.error) ? send.error.response?.status : undefined
  const errorKey = !send.isError
    ? null
    : status === 429
      ? 'errors.tooFast'
      : status === 400
        ? 'errors.closed'
        : 'errors.sendFailed'
  const remaining = MAX_MESSAGE - text.length

  return (
    <form onSubmit={submit} className="flex flex-col gap-1 border-t border-brand-forest/10 p-3">
      {errorKey && (
        <p role="alert" className="text-xs text-state-danger">
          {t(errorKey)}
        </p>
      )}
      <div className="flex items-end gap-2">
        <label className="sr-only" htmlFor={`composer-${conversationId}`}>
          {t('composer.label')}
        </label>
        <textarea
          id={`composer-${conversationId}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('composer.placeholder')}
          maxLength={MAX_MESSAGE}
          rows={2}
          className="max-h-40 min-h-[2.75rem] flex-1 resize-y rounded-xl border border-text-secondary/25 bg-bg-canvas px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-forest"
        />
        <Button type="submit" isLoading={send.isPending} disabled={!trimmed} aria-label={t('composer.send')}>
          {!send.isPending && <PaperPlaneRight size={18} weight="duotone" />}
          <span className="hidden sm:inline">{t('composer.send')}</span>
        </Button>
      </div>
      <p className="flex justify-between gap-2 text-[11px] text-text-secondary">
        <span className="hidden sm:inline">{t('composer.hint')}</span>
        {remaining <= 200 && <span>{t('composer.remaining', { count: remaining })}</span>}
      </p>
    </form>
  )
}
