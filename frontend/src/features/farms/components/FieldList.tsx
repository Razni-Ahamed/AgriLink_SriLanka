import { Link } from 'react-router-dom'
import { Barn } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { CardHover } from '@/components/ui/motion/CardHover'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { formatQuantity } from '@/lib/utils'
import type { FieldDto } from '@/types/dto/farms'

export function FieldList({ farmId, fields }: { farmId: number; fields: FieldDto[] }) {
  const { t } = useTranslation(['farms', 'common'])

  if (fields.length === 0) {
    return <p className="text-sm text-text-secondary">{t('farms:detail.noFields')}</p>
  }

  return (
    <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((field) => (
        <StaggerList.Item key={field.fieldId}>
          <CardHover>
            <Link to={`/farms/${farmId}/fields/${field.fieldId}`}>
              <Card className="flex flex-col gap-3">
                <IconBadge tone="harvest">
                  <Barn size={20} weight="duotone" />
                </IconBadge>
                <h3 className="font-display text-lg text-text-primary">{field.name}</h3>
                <p className="font-mono text-sm text-brand-forest">
                  {t('common:units.acres', { value: formatQuantity(field.area) })}
                </p>
              </Card>
            </Link>
          </CardHover>
        </StaggerList.Item>
      ))}
    </StaggerList>
  )
}
