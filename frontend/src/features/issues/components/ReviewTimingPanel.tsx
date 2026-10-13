import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, HourglassMedium, Timer, WarningCircle } from '@phosphor-icons/react'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { MetricsCard } from '@/components/ui/MetricsCard'
import { useFormatWait } from '../lib/reviewTiming'

interface ReviewTimingPanelProps {
  /** 'district' on the officer dashboard (their district, their own reviews); 'platform' for admin. */
  scope: 'district' | 'platform'
  overdue: number
  oldestPendingHours?: number | null
  averageReviewHours?: number | null
  reviewsInAverage: number
  overdueAfterHours: number
  queueLink: string
}

/** How long farmers are waiting for an officer: overdue issues, the longest wait now, and the
 *  average time to a decision over the last 30 days. */
export function ReviewTimingPanel({
  scope,
  overdue,
  oldestPendingHours,
  averageReviewHours,
  reviewsInAverage,
  overdueAfterHours,
  queueLink,
}: ReviewTimingPanelProps) {
  const { t } = useTranslation(['issues', 'common'])
  const formatWait = useFormatWait()

  return (
    <section className="flex flex-col gap-3" aria-labelledby="review-timing-title">
      <h2 id="review-timing-title" className="font-display text-lg text-text-primary">
        {t('reviewTiming.title')}
      </h2>

      {overdue > 0 && (
        <Link
          to={queueLink}
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-state-danger/30 bg-state-danger/10 p-3 text-sm text-text-primary hover:opacity-90"
        >
          <WarningCircle size={20} weight="duotone" className="mt-0.5 shrink-0 text-state-danger" />
          <span>{t('reviewTiming.overdueWarning', { count: overdue, hours: overdueAfterHours })}</span>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to={queueLink} className="block transition-opacity hover:opacity-90">
          <MetricsCard
            label={t(scope === 'district' ? 'reviewTiming.overdueDistrict' : 'reviewTiming.overduePlatform', {
              hours: overdueAfterHours,
            })}
            value={overdue}
            icon={<HourglassMedium size={20} weight="duotone" />}
            tone={overdue > 0 ? 'terracotta' : 'forest'}
          />
        </Link>
        <DurationCard
          label={t('reviewTiming.oldestWaiting')}
          value={oldestPendingHours == null ? t('reviewTiming.noneWaiting') : formatWait(oldestPendingHours)}
          icon={<Clock size={20} weight="duotone" />}
        />
        <DurationCard
          label={t(scope === 'district' ? 'reviewTiming.myAverage' : 'reviewTiming.average')}
          value={averageReviewHours == null ? t('reviewTiming.noReviews') : formatWait(averageReviewHours)}
          hint={averageReviewHours == null ? undefined : t('reviewTiming.basedOn', { count: reviewsInAverage })}
          icon={<Timer size={20} weight="duotone" />}
        />
      </div>
    </section>
  )
}

function DurationCard({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3">
      <IconBadge tone="harvest">{icon}</IconBadge>
      <div>
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="font-mono text-2xl text-text-primary">{value}</p>
        {hint && <p className="text-xs text-text-secondary">{hint}</p>}
      </div>
    </Card>
  )
}
