import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { IconBadge } from '@/components/ui/IconBadge'
import { useCountUp } from '../hooks/useCountUp'

interface MetricsCardProps {
  label: string
  value: number
  icon: ReactNode
  tone?: 'forest' | 'harvest' | 'terracotta'
  suffix?: string
}

export function MetricsCard({ label, value, icon, tone = 'forest', suffix }: MetricsCardProps) {
  const animated = useCountUp(value)

  return (
    <Card className="flex flex-col gap-3">
      <IconBadge tone={tone}>{icon}</IconBadge>
      <div>
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="font-mono text-2xl text-text-primary">
          {animated.toLocaleString('en-LK')}
          {suffix}
        </p>
      </div>
    </Card>
  )
}
