import { Link } from 'react-router-dom'
import { Basket, Calendar, MapPin } from '@phosphor-icons/react'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatQuantity } from '@/lib/utils'
import type { HarvestListingResponse } from '@/types/dto/harvests'

const statusVariant = {
  Active: 'success',
  Sold: 'neutral',
  Cancelled: 'danger',
} as const

export function HarvestCard({ harvest }: { harvest: HarvestListingResponse }) {
  return (
    <Link to={`/marketplace/${harvest.harvestId}`}>
      <Card interactive className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <IconBadge tone="forest">
            <Basket size={20} weight="duotone" />
          </IconBadge>
          <Badge variant={statusVariant[harvest.status]}>{harvest.status}</Badge>
        </div>

        <div>
          <h3 className="font-display text-lg text-text-primary">{harvest.cropType}</h3>
          {harvest.variety && <p className="text-sm text-text-secondary">{harvest.variety}</p>}
        </div>

        <p className="flex items-center gap-1 text-sm text-text-secondary">
          <MapPin size={14} />
          {harvest.district}
        </p>

        <p className="flex items-center gap-1 text-sm text-text-secondary">
          <Calendar size={14} />
          {formatDate(harvest.harvestDate)}
        </p>

        <div className="mt-1 flex items-baseline justify-between">
          <span className="font-mono tabular-nums text-brand-forest">
            Rs {harvest.pricePerUnit.toLocaleString('en-LK', { maximumFractionDigits: 2 })}/unit
          </span>
          <span className="font-mono tabular-nums text-sm text-text-secondary">
            {formatQuantity(harvest.availableQuantity)} avail.
          </span>
        </div>
      </Card>
    </Link>
  )
}
