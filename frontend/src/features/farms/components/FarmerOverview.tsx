import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Basket, ClipboardText, FirstAidKit, Lightbulb, Truck } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCropLabel } from '@/lib/useCropLabel'
import { cn, formatQuantity } from '@/lib/utils'
import { useFarmerOverview } from '../hooks/useFarmerOverview'

/**
 * The top of a farmer's home page: what needs them, each a link to the page that deals with it.
 * A count that needs action (a problem awaiting advice, a buyer waiting for an answer) is
 * coloured; zero stays quiet. Shows nothing if it can't load, so the farms below still work.
 */
export function FarmerOverview() {
  const { t } = useTranslation('farms')
  const cropLabel = useCropLabel()
  const { data, isLoading, isError } = useFarmerOverview()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
    )
  }
  if (isError || !data) {
    return null
  }

  return (
    <section aria-label={t('overview.label')} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          to="/issues/mine"
          value={data.openIssues}
          label={t('overview.openIssues')}
          icon={<FirstAidKit size={20} weight="duotone" />}
          needsAction
        />
        <Tile
          to="/marketplace/requests"
          value={data.pendingRequests}
          label={t('overview.pendingRequests')}
          icon={<ClipboardText size={20} weight="duotone" />}
          needsAction
        />
        <Tile
          to="/marketplace/mine"
          value={data.activeListings}
          label={t('overview.activeListings')}
          icon={<Basket size={20} weight="duotone" />}
        />
        <Tile
          to="/orders/mine"
          value={data.ordersInProgress}
          label={t('overview.ordersInProgress')}
          icon={<Truck size={20} weight="duotone" />}
        />
      </div>

      {data.latestAdvice && (
        <Link
          to={`/advisories/${data.latestAdvice.advisoryId}`}
          className="flex items-center gap-3 rounded-2xl border border-brand-harvest/25 bg-brand-harvest/[0.07] px-4 py-3 text-sm text-text-primary transition-colors hover:bg-brand-harvest/15 focus-visible:outline-2 focus-visible:outline-brand-forest"
        >
          <Lightbulb
            size={20}
            weight="duotone"
            className="shrink-0 text-brand-harvest"
            aria-hidden="true"
          />
          <span className="min-w-0 truncate">
            {t('overview.latestAdvice', {
              title: data.latestAdvice.issueTitle,
              crop: cropLabel(data.latestAdvice.cropType),
            })}
          </span>
        </Link>
      )}
    </section>
  )
}

function Tile({
  to,
  value,
  label,
  icon,
  needsAction = false,
}: {
  to: string
  value: number
  label: string
  icon: ReactNode
  /** Colour a non-zero count: someone is waiting on the farmer. */
  needsAction?: boolean
}) {
  const highlighted = needsAction && value > 0
  return (
    <Link
      to={to}
      className={cn(
        'flex flex-col gap-1 rounded-2xl border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-brand-forest',
        highlighted
          ? 'border-brand-terracotta/30 bg-brand-terracotta/[0.06] hover:bg-brand-terracotta/10'
          : 'border-brand-forest/10 bg-bg-surface hover:bg-brand-forest/[0.05]',
      )}
    >
      <span
        className={cn('flex', highlighted ? 'text-brand-terracotta' : 'text-brand-forest')}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span
        className={cn(
          'text-3xl font-semibold tabular-nums',
          highlighted ? 'text-brand-terracotta' : 'text-text-primary',
        )}
      >
        {formatQuantity(value)}
      </span>
      <span className="text-sm leading-snug text-text-secondary">{label}</span>
    </Link>
  )
}
