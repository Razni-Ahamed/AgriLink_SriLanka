import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { CropIcon } from '@/components/ui/CropIcon'
import { IconBadge } from '@/components/ui/IconBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { formatDate } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { SeverityBadge } from '../components/SeverityBadge'
import { useAllIssues } from '../hooks/useIssues'
import type { CropIssueResponse, IssueStatus } from '@/types/dto/issues'

const statusVariant: Record<IssueStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  Pending: 'info',
  AwaitingReview: 'warning',
  Resolved: 'success',
  Rejected: 'danger',
}

function AllIssuesCard({ issue }: { issue: CropIssueResponse }) {
  const { t } = useTranslation('issues')
  const statusLabel = useStatusLabel()

  // Officer/Admin never get the Draft-advisory 404 a farmer would (AdvisoriesController.GetById
  // bypasses that check for both roles), so unlike "My Issues" this can always link straight
  // through once there's an advisory at all, regardless of where it stands in review.
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
      <p className="line-clamp-2 text-sm text-text-secondary">{issue.description}</p>
      <div className="flex items-center justify-between">
        <Badge variant={statusVariant[issue.status]}>{statusLabel('issue', issue.status)}</Badge>
        <span className="text-xs text-text-secondary">{formatDate(issue.createdAt)}</span>
      </div>
    </Card>
  )

  return issue.advisoryId ? <Link to={`/advisories/${issue.advisoryId}`}>{content}</Link> : content
}

/** Admin-only oversight view: every issue ever reported, any status, with who reported it. */
export function AllIssuesPage() {
  const { t } = useTranslation('issues')
  const { data: issues, isLoading, isError, error } = useAllIssues()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-text-primary">{t('all.title')}</h1>
        <p className="text-sm text-text-secondary">{t('all.subtitle')}</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      )}

      {/* A failed request used to leave this exact area blank — no loading skeleton (it had
          already stopped), no card grid, and no message either, so it looked identical to
          "nothing to show" from a user's point of view. */}
      {isError && (
        <p className="text-sm text-state-danger">
          {t('all.loadError')}
          {import.meta.env.DEV && error instanceof Error && `: ${error.message}`}
        </p>
      )}

      {!isLoading && !isError && issues && issues.length === 0 && (
        <p className="text-sm text-text-secondary">{t('all.empty')}</p>
      )}

      {!isLoading && !isError && issues && issues.length > 0 && (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {issues.map((issue) => (
            <StaggerList.Item key={issue.issueId}>
              <AllIssuesCard issue={issue} />
            </StaggerList.Item>
          ))}
        </StaggerList>
      )}
    </div>
  )
}
