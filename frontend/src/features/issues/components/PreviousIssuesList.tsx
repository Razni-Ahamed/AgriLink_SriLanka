import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClockCounterClockwise } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { SeverityBadge } from './SeverityBadge'
import type { PreviousIssueSummary } from '@/types/dto/advisories'
import type { IssueStatus } from '@/types/dto/issues'

const statusVariant: Record<IssueStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  Pending: 'info',
  AwaitingReview: 'warning',
  Resolved: 'success',
  Rejected: 'danger',
}

/**
 * Other issues reported on the same crop — "has this happened before?" is core triage context
 * that used to be invisible to a reviewer: nothing surfaced a crop's issue history anywhere,
 * so a recurring problem looked identical to a first-time one.
 */
export function PreviousIssuesList({ issues }: { issues: PreviousIssueSummary[] }) {
  const { t } = useTranslation('issues')
  const statusLabel = useStatusLabel()

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-bg-canvas p-3 text-sm text-text-secondary">
        <ClockCounterClockwise size={16} />
        {t('previousIssues.empty')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-bg-canvas p-3">
      <h3 className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
        <ClockCounterClockwise size={16} />
        {t('previousIssues.title', { count: issues.length })}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {issues.map((issue) => {
          const row = (
            <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <SeverityBadge severity={issue.severity} />
                <span className="truncate text-text-primary">{issue.title}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-text-secondary">{formatDate(issue.createdAt)}</span>
                <Badge variant={statusVariant[issue.status]}>
                  {statusLabel('issue', issue.status)}
                </Badge>
              </div>
            </div>
          )

          return (
            <li key={issue.issueId}>
              {issue.advisoryId ? (
                <Link
                  to={`/advisories/${issue.advisoryId}`}
                  className="block rounded-lg hover:bg-brand-forest/5"
                >
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
