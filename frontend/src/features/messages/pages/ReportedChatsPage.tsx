import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Flag } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'
import { useUiStore } from '@/lib/useUiStore'
import type { ConversationReport } from '@/types/dto/conversations'
import { ChatThread } from '../components/ChatThread'
import { useConversationReports, useResolveConversationReport } from '../hooks/useConversations'

const KIND_KEY = { Deal: 'kind.Deal', Advice: 'kind.Advice' } as const

/** Admin: chats a participant reported, open ones first. */
export function ReportedChatsPage() {
  const { t } = useTranslation('messages')
  const { data, isLoading } = useConversationReports()
  const reports = data?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-text-primary">{t('reports.title')}</h1>
        <p className="text-sm text-text-secondary">{t('reports.subtitle')}</p>
      </div>

      {isLoading && <Skeleton className="h-32" />}

      {!isLoading && reports.length === 0 && (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <IconBadge tone="forest">
            <Flag size={20} weight="duotone" />
          </IconBadge>
          <p className="text-sm text-text-secondary">{t('reports.empty')}</p>
        </Card>
      )}

      {reports.length > 0 && (
        <ul className="flex flex-col gap-3">
          {reports.map((report) => (
            <li key={report.reportId}>
              <ReportCard report={report} showChatLink />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Admin: one reported chat, read-only, with its reports beside it. */
export function ReportedChatPage() {
  const { t } = useTranslation('messages')
  const { conversationId } = useParams<{ conversationId: string }>()
  const id = Number(conversationId)
  const { data } = useConversationReports()
  const reports = (data?.items ?? []).filter((report) => report.conversationId === id)

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/admin/reported-chats"
        className="flex w-fit items-center gap-1 text-sm text-text-secondary hover:text-brand-forest"
      >
        <ArrowLeft size={14} />
        {t('reports.back')}
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_22rem]">
        <Card className="h-[calc(100dvh-14rem)] min-h-[26rem] overflow-hidden p-0">
          <ChatThread conversationId={id} mode="admin" backTo="/admin/reported-chats" backLabel={t('reports.back')} />
        </Card>
        <section className="flex flex-col gap-3" aria-labelledby="reports-on-chat">
          <h2 id="reports-on-chat" className="font-display text-lg text-text-primary">
            {t('reports.onThisChat')}
          </h2>
          {reports.map((report) => (
            <ReportCard key={report.reportId} report={report} />
          ))}
        </section>
      </div>
    </div>
  )
}

function ReportCard({ report, showChatLink = false }: { report: ConversationReport; showChatLink?: boolean }) {
  const { t } = useTranslation('messages')
  const [note, setNote] = useState('')
  const resolve = useResolveConversationReport()
  const addToast = useUiStore((state) => state.addToast)
  const isOpen = report.resolvedAt === null

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-base text-text-primary">{report.title}</p>
          <p className="text-xs text-text-secondary">
            {t(KIND_KEY[report.kind])} ·{' '}
            {t('reports.reportedBy', { name: report.reporterName, date: formatDate(report.createdAt) })}
          </p>
        </div>
        <Badge variant={isOpen ? 'warning' : 'success'}>{t(isOpen ? 'reports.open' : 'reports.resolved')}</Badge>
      </div>

      <p className="whitespace-pre-wrap text-sm text-text-primary">{report.reason}</p>

      {!isOpen && (
        <p className="text-xs text-text-secondary">
          {t('reports.resolvedBy', { name: report.resolvedByName ?? '', date: formatDate(report.resolvedAt!) })}
          {report.resolutionNote && ` · ${report.resolutionNote}`}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        {showChatLink && (
          <Link
            to={`/admin/reported-chats/${report.conversationId}`}
            className="text-sm font-medium text-brand-forest hover:underline"
          >
            {t('reports.viewChat')}
          </Link>
        )}
        {isOpen && (
          <form
            className="ml-auto flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              resolve.mutate(
                { reportId: report.reportId, note: note.trim() || undefined },
                {
                  onSuccess: () => addToast({ type: 'success', message: t('reports.resolvedToast') }),
                  onError: () => addToast({ type: 'error', message: t('reports.resolveError') }),
                },
              )
            }}
          >
            <Input
              label={t('reports.note')}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              className="w-56"
            />
            <Button type="submit" size="sm" isLoading={resolve.isPending}>
              {t('reports.resolve')}
            </Button>
          </form>
        )}
      </div>
    </Card>
  )
}
