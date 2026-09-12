import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Building,
  CheckCircle,
  ClipboardText,
  ListChecks,
  MapPin,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react'
import { Card } from '@/components/ui/Card'
import { MetricsCard } from '@/components/ui/MetricsCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { useOfficerMetrics } from '../hooks/useOfficerMetrics'

/**
 * The officer's home screen — Admin has had a dashboard like this since the start; Officer had
 * nothing of their own until now, not even a count of how many issues are waiting on them.
 * Everything here is scoped to this one officer: their district's queue, their own review
 * history — not the platform-wide numbers Admin's dashboard shows.
 */
export function OfficerDashboardPage() {
  const { t } = useTranslation('officer')
  const { data: metrics, isLoading } = useOfficerMetrics()

  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-text-primary">{t('dashboard.title')}</h1>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="flex items-center gap-1 rounded-full bg-brand-forest/10 px-3 py-1">
            <MapPin size={14} />
            {metrics.district}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-brand-forest/10 px-3 py-1">
            <Building size={14} />
            {metrics.departmentName}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/issues/pending" className="block transition-opacity hover:opacity-90">
          <MetricsCard
            label={t('dashboard.pendingInDistrict')}
            value={metrics.pendingInDistrict}
            icon={<WarningCircle size={20} weight="duotone" />}
            tone="harvest"
          />
        </Link>
        <MetricsCard
          label={t('dashboard.reviewedToday')}
          value={metrics.reviewedToday}
          icon={<CheckCircle size={20} weight="duotone" />}
          tone="forest"
        />
        <Link to="/issues/reviewed" className="block transition-opacity hover:opacity-90">
          <MetricsCard
            label={t('dashboard.approvedTotal')}
            value={metrics.approvedTotal}
            icon={<CheckCircle size={20} weight="duotone" />}
            tone="forest"
          />
        </Link>
        <Link to="/issues/reviewed" className="block transition-opacity hover:opacity-90">
          <MetricsCard
            label={t('dashboard.rejectedTotal')}
            value={metrics.rejectedTotal}
            icon={<XCircle size={20} weight="duotone" />}
            tone="terracotta"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link to="/issues/pending">
          <Card interactive className="flex items-center gap-3">
            <ListChecks size={22} weight="duotone" className="text-brand-forest" />
            <div>
              <p className="font-medium text-text-primary">{t('dashboard.goToQueue')}</p>
              <p className="text-sm text-text-secondary">{t('dashboard.goToQueueHint')}</p>
            </div>
          </Card>
        </Link>
        <Link to="/issues/reviewed">
          <Card interactive className="flex items-center gap-3">
            <ClipboardText size={22} weight="duotone" className="text-brand-forest" />
            <div>
              <p className="font-medium text-text-primary">{t('dashboard.goToReviews')}</p>
              <p className="text-sm text-text-secondary">{t('dashboard.goToReviewsHint')}</p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
