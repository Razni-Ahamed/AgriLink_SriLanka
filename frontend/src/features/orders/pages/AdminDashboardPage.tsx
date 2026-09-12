import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Basket, Farm, UserCircle, WarningCircle } from '@/components/ui/icons'
import { CropGenericIcon, HarvestScaleIcon } from '@/components/ui/icons/custom'
import { Skeleton } from '@/components/ui/Skeleton'
import { MetricsBarChart } from '../components/MetricsBarChart'
import { MetricsCard } from '../components/MetricsCard'
import { useAdminMetrics } from '../hooks/useAdminMetrics'

export function AdminDashboardPage() {
  const { t } = useTranslation('orders')
  const { data: metrics, isLoading } = useAdminMetrics()

  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    )
  }

  const chartData = [
    { label: t('admin.chartUsers'), value: metrics.totalUsers },
    { label: t('admin.chartFarms'), value: metrics.totalFarms },
    { label: t('admin.chartCrops'), value: metrics.totalCrops },
    { label: t('admin.issuesReported'), value: metrics.issuesReported },
    { label: t('admin.issuesPending'), value: metrics.issuesPending },
    { label: t('admin.issuesResolved'), value: metrics.issuesResolved },
  ]

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text-primary">{t('admin.dashboardTitle')}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricsCard
          label={t('admin.totalUsers')}
          value={metrics.totalUsers}
          icon={<UserCircle size={20} weight="duotone" />}
          tone="forest"
        />
        <MetricsCard
          label={t('admin.totalFarms')}
          value={metrics.totalFarms}
          icon={<Farm size={20} weight="duotone" />}
          tone="forest"
        />
        <MetricsCard
          label={t('admin.totalCrops')}
          value={metrics.totalCrops}
          icon={<CropGenericIcon size={20} />}
          tone="forest"
        />

        {/* "Issues reported" is a lifetime total, not a "currently open" count — it looked like
            it disagreed with an empty Pending Issues queue until you noticed this card sits
            right next to it. All three link to the full per-issue detail view instead of
            leaving that relationship to be inferred from three numbers side by side. */}
        <Link to="/issues/all" className="block transition-opacity hover:opacity-90">
          <MetricsCard
            label={t('admin.issuesReported')}
            value={metrics.issuesReported}
            icon={<WarningCircle size={20} weight="duotone" />}
            tone="terracotta"
          />
        </Link>
        <Link to="/issues/all" className="block transition-opacity hover:opacity-90">
          <MetricsCard
            label={t('admin.issuesPending')}
            value={metrics.issuesPending}
            icon={<WarningCircle size={20} weight="duotone" />}
            tone="harvest"
          />
        </Link>
        <Link to="/issues/all" className="block transition-opacity hover:opacity-90">
          <MetricsCard
            label={t('admin.issuesResolved')}
            value={metrics.issuesResolved}
            icon={<Basket size={20} weight="duotone" />}
            tone="harvest"
          />
        </Link>

        <MetricsCard
          label={t('admin.harvestVolume')}
          value={metrics.harvestVolumeSoldThisMonth}
          icon={<HarvestScaleIcon size={20} />}
          tone="harvest"
          suffix=" kg"
        />
      </div>

      <MetricsBarChart data={chartData} />
    </div>
  )
}
