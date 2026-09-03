import { Farm as FarmIcon, MapPin } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { CardHover } from '@/components/ui/motion/CardHover'
import { formatQuantity } from '@/lib/utils'
import type { FarmDto } from '@/types/dto/farms'

export function FarmCard({ farm }: { farm: FarmDto }) {
  const { t } = useTranslation()

  return (
    <CardHover>
      <Link to={`/farms/${farm.farmId}`}>
        <Card className="flex flex-col gap-3">
          <IconBadge tone="forest">
            <FarmIcon size={20} weight="duotone" />
          </IconBadge>
          <div>
            <h3 className="font-display text-lg text-text-primary">{farm.name}</h3>
            <p className="flex items-center gap-1 text-sm text-text-secondary">
              <MapPin size={14} />
              {farm.district}
            </p>
          </div>
          <p className="font-mono text-sm text-brand-forest">
            {t('units.acres', { value: formatQuantity(farm.area) })}
          </p>
        </Card>
      </Link>
    </CardHover>
  )
}
