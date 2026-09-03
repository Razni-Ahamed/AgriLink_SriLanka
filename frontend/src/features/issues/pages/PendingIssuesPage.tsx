import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { formatDate } from '@/lib/utils'
import { SeverityBadge } from '../components/SeverityBadge'
import { usePendingIssues } from '../hooks/useIssues'

export function PendingIssuesPage() {
  const { data: issues, isLoading } = usePendingIssues()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text-primary">Pending Issues</h1>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      )}

      {!isLoading && issues && issues.length === 0 && (
        <p className="text-sm text-text-secondary">No issues are awaiting review right now.</p>
      )}

      {!isLoading && issues && issues.length > 0 && (
        <StaggerList className="flex flex-col gap-3">
          {issues.map((issue) => (
            <StaggerList.Item key={issue.issueId}>
              <Link to={issue.advisoryId ? `/advisories/${issue.advisoryId}` : '#'}>
                <Card interactive className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-base text-text-primary">{issue.title}</h3>
                    <p className="text-xs text-text-secondary">
                      Crop #{issue.cropId} · Reported {formatDate(issue.createdAt)}
                    </p>
                  </div>
                  <SeverityBadge severity={issue.severity} />
                </Card>
              </Link>
            </StaggerList.Item>
          ))}
        </StaggerList>
      )}
    </div>
  )
}
