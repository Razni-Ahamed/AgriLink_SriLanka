import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Basket,
  ClipboardText,
  FirstAidKit,
  Lightbulb,
  Truck,
} from '@phosphor-icons/react'
import { Odometer } from '@/components/canopy/Odometer'
import { BannerGlass } from '@/components/canopy/PhotoBanner'
import { useCropLabel } from '@/lib/useCropLabel'
import { cn } from '@/lib/utils'
import { useFarmerOverview } from '../hooks/useFarmerOverview'

/**
 * What needs the farmer, as a glass strip floating on the home page's photo: four counts, each a
 * link to the page that deals with it, and the newest advice under them. A count that someone is
 * waiting on (a problem awaiting advice, a buyer waiting for an answer) glows turmeric; zero stays
 * quiet. Shows nothing if it can't load, so the rest of the page still works.
 */
export function FarmerOverview() {
  const { t } = useTranslation('farms')
  const cropLabel = useCropLabel()
  const { data, isLoading, isError } = useFarmerOverview()

  if (isLoading) {
    return <BannerGlass className="h-[104px] animate-pulse" />
  }
  if (isError || !data) {
    return null
  }

  return (
    <section aria-label={t('overview.label')}>
      <BannerGlass className="overflow-hidden">
        <div className="grid grid-cols-2 divide-white/10 lg:grid-cols-4 lg:divide-x">
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
            className="group flex items-center gap-3 border-t border-white/10 px-4 py-3 text-sm transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
          >
            <Lightbulb
              size={20}
              weight="duotone"
              className="shrink-0 text-[#efc062]"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate">
              {t('overview.latestAdvice', {
                title: data.latestAdvice.issueTitle,
                crop: cropLabel(data.latestAdvice.cropType),
              })}
            </span>
            <ArrowRight
              size={16}
              className="shrink-0 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        )}
      </BannerGlass>
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
      className="group flex flex-col gap-1 px-4 py-3.5 transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
    >
      <span className="flex items-center gap-2">
        <span
          className={cn('flex', highlighted ? 'text-[#efc062]' : 'text-white/70')}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span
          className={cn(
            'font-display text-3xl leading-none font-bold',
            highlighted ? 'text-[#efc062]' : 'text-white',
          )}
        >
          <Odometer value={value} />
        </span>
      </span>
      <span className="text-sm leading-snug text-white/75">{label}</span>
    </Link>
  )
}
