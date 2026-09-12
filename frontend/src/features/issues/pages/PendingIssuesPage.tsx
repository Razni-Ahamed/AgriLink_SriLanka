import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { CropIcon } from '@/components/ui/CropIcon'
import { IconBadge } from '@/components/ui/IconBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { formatDate } from '@/lib/utils'
import { SeverityBadge } from '../components/SeverityBadge'
import { usePendingIssues } from '../hooks/useIssues'

export function PendingIssuesPage() {
  const { t } = useTranslation('issues')
  const { data: issues, isLoading } = usePendingIssues()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text-primary">{t('pending.title')}</h1>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      )}

      {!isLoading && issues && issues.length === 0 && (
        <p className="text-sm text-text-secondary">{t('pending.empty')}</p>
      )}

      {!isLoading && issues && issues.length > 0 && (
        <StaggerList className="flex flex-col gap-3">
          {issues.map((issue) => {
            // Which crop it is drives most of the officer's triage, so it leads the row
            // instead of the bare crop id this used to show.
            return (
              <StaggerList.Item key={issue.issueId}>
                <Link to={issue.advisoryId ? `/advisories/${issue.advisoryId}` : '#'}>
                  <Card interactive className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <IconBadge tone="forest" className="shrink-0">
                        <CropIcon cropType={issue.cropType} size={18} />
                      </IconBadge>
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-base text-text-primary">
                          {issue.title}
                        </h3>
                        <p className="truncate text-xs text-text-secondary">
                          {t('pending.cropAndDate', {
                            crop: issue.variety
                              ? `${issue.cropType} · ${issue.variety}`
                              : issue.cropType,
                            date: formatDate(issue.createdAt),
                          })}
                        </p>
                      </div>
                    </div>
                    <SeverityBadge severity={issue.severity} />
                  </Card>
                </Link>
              </StaggerList.Item>
            )
          })}
        </StaggerList>
      )}
    </div>
  )
}
