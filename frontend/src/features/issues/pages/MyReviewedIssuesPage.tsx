import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { CropIcon } from '@/components/ui/CropIcon'
import { IconBadge } from '@/components/ui/IconBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { formatDate } from '@/lib/utils'
import { SeverityBadge } from '../components/SeverityBadge'
import { useReviewedIssues } from '../hooks/useIssues'
import type { CropIssueResponse } from '@/types/dto/issues'

// A reviewed issue's IssueStatus is always one of these two outcomes — Pending/AwaitingReview
// can't appear here, since GET /api/issues/reviewed only returns issues this officer has
// actually approved or rejected.
const outcomeVariant = {
  Resolved: 'success',
  Rejected: 'danger',
} as const

function ReviewedIssueCard({ issue }: { issue: CropIssueResponse }) {
  const { t } = useTranslation('issues')
  const outcome = issue.status === 'Rejected' ? 'Rejected' : 'Resolved'

  const content = (
    <Card interactive={Boolean(issue.advisoryId)} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <IconBadge tone="forest" className="shrink-0">
            <CropIcon cropType={issue.cropType} size={18} />
          </IconBadge>
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg text-text-primary">{issue.title}</h3>
            <p className="truncate text-xs text-text-secondary">
              {t('all.reportedBy', { name: issue.reporterName || t('all.unknownReporter') })}
              {issue.district && ` · ${issue.district}`}
            </p>
          </div>
        </div>
        <SeverityBadge severity={issue.severity} />
      </div>

      {issue.reviewNote && (
        <p className="line-clamp-2 rounded-lg bg-bg-canvas p-2 text-sm text-text-secondary">
          {issue.reviewNote}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Badge variant={outcomeVariant[outcome]}>{t(`reviewed.outcome.${outcome}`)}</Badge>
        <span className="text-xs text-text-secondary">
          {issue.reviewedAt
            ? t('reviewed.reviewedOn', { date: formatDate(issue.reviewedAt) })
            : formatDate(issue.createdAt)}
        </span>
      </div>
    </Card>
  )

  return issue.advisoryId ? <Link to={`/advisories/${issue.advisoryId}`}>{content}</Link> : content
}

/** Officer's own decision history — before this existed, an approved/rejected issue simply
 *  disappeared from view once it left the Draft-only Pending queue. */
export function MyReviewedIssuesPage() {
  const { t } = useTranslation('issues')
  const { data: issues, isLoading, isError, error } = useReviewedIssues()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-text-primary">{t('reviewed.title')}</h1>
        <p className="text-sm text-text-secondary">{t('reviewed.subtitle')}</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-state-danger">
          {t('reviewed.loadError')}
          {import.meta.env.DEV && error instanceof Error && `: ${error.message}`}
        </p>
      )}

      {!isLoading && !isError && issues && issues.length === 0 && (
        <p className="text-sm text-text-secondary">{t('reviewed.empty')}</p>
      )}

      {!isLoading && !isError && issues && issues.length > 0 && (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {issues.map((issue) => (
            <StaggerList.Item key={issue.issueId}>
              <ReviewedIssueCard issue={issue} />
            </StaggerList.Item>
          ))}
        </StaggerList>
      )}
    </div>
  )
}
