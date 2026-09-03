import { Basket, Farm, UserCircle, WarningCircle } from '@/components/ui/icons'
import { CropGenericIcon, HarvestScaleIcon } from '@/components/ui/icons/custom'
import { Skeleton } from '@/components/ui/Skeleton'
import { MetricsBarChart } from '../components/MetricsBarChart'
import { MetricsCard } from '../components/MetricsCard'
import { useAdminMetrics } from '../hooks/useAdminMetrics'

export function AdminDashboardPage() {
  const { data: metrics, isLoading } = useAdminMetrics()

  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    )
  }

  const chartData = [
    { label: 'Users', value: metrics.totalUsers },
    { label: 'Farms', value: metrics.totalFarms },
    { label: 'Crops', value: metrics.totalCrops },
    { label: 'Issues reported', value: metrics.issuesReported },
    { label: 'Issues resolved', value: metrics.issuesResolved },
  ]

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-text-primary">Admin Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricsCard
          label="Total users"
          value={metrics.totalUsers}
          icon={<UserCircle size={20} weight="duotone" />}
          tone="forest"
        />
        <MetricsCard
          label="Total farms"
          value={metrics.totalFarms}
          icon={<Farm size={20} weight="duotone" />}
          tone="forest"
        />
        <MetricsCard
          label="Total crops"
          value={metrics.totalCrops}
          icon={<CropGenericIcon size={20} />}
          tone="forest"
        />
        <MetricsCard
          label="Issues reported"
          value={metrics.issuesReported}
          icon={<WarningCircle size={20} weight="duotone" />}
          tone="terracotta"
        />
        <MetricsCard
          label="Issues resolved"
          value={metrics.issuesResolved}
          icon={<Basket size={20} weight="duotone" />}
          tone="harvest"
        />
        <MetricsCard
          label="Harvest volume sold this month"
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
