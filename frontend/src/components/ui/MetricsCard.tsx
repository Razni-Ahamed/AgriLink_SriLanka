import type { ReactNode } from 'react'
import { Odometer } from '@/components/canopy/Odometer'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { formatQuantity } from '@/lib/utils'

interface MetricsCardProps {
  label: string
  value: number
  icon: ReactNode
  tone?: 'forest' | 'harvest' | 'terracotta'
  suffix?: string
}

/** A dashboard number whose digits roll up from zero when the card appears. */
export function MetricsCard({ label, value, icon, tone = 'forest', suffix }: MetricsCardProps) {
  return (
    <Card className="flex flex-col gap-4">
      <IconBadge tone={tone}>{icon}</IconBadge>
      <div>
        <p className="font-display text-4xl leading-none font-bold text-text-primary">
          <Odometer value={value} format={formatQuantity} rollIn />
          {suffix}
        </p>
        <p className="mt-2 text-sm text-text-secondary">{label}</p>
      </div>
    </Card>
  )
}
