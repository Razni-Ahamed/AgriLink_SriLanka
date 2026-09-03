import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { formatDate } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { SeverityBadge } from '../components/SeverityBadge'
import { useMyIssues } from '../hooks/useIssues'
import type { CropIssueResponse, IssueStatus } from '@/types/dto/issues'

const statusVariant: Record<IssueStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  Pending: 'info',
  AwaitingReview: 'warning',
  Resolved: 'success',
  Rejected: 'danger',
}

function IssueCard({ issue }: { issue: CropIssueResponse }) {
  const statusLabel = useStatusLabel()

  // The AI advisory starts out Draft until an officer reviews it, and the backend
  // hides Draft advisories from the farmer who filed the issue (404s them) — so we
  // only link through once the issue has actually been decided.
  const isReviewed = issue.status === 'Resolved' || issue.status === 'Rejected'
  const canLink = isReviewed && Boolean(issue.advisoryId)

  const content = (
    <Card interactive={canLink} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-lg text-text-primary">{issue.title}</h3>
        <SeverityBadge severity={issue.severity} />
      </div>
      <p className="line-clamp-2 text-sm text-text-secondary">{issue.description}</p>
      <div className="flex items-center justify-between">
        <Badge variant={statusVariant[issue.status]}>{statusLabel('issue', issue.status)}</Badge>
        <span className="text-xs text-text-secondary">{formatDate(issue.createdAt)}</span>
      </div>
    </Card>
  )

  return canLink ? <Link to={`/advisories/${issue.advisoryId}`}>{content}</Link> : content
}

export function MyIssuesPage() {
  const { t } = useTranslation('issues')
  const { data: issues, isLoading } = useMyIssues()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text-primary">{t('mine.title')}</h1>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      )}

      {!isLoading && issues && issues.length === 0 && (
        <p className="text-sm text-text-secondary">{t('mine.empty')}</p>
      )}

      {!isLoading && issues && issues.length > 0 && (
        <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {issues.map((issue) => (
            <StaggerList.Item key={issue.issueId}>
              <IssueCard issue={issue} />
            </StaggerList.Item>
          ))}
        </StaggerList>
      )}
    </div>
  )
}
