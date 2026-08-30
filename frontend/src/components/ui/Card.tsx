import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { CardHover } from './motion/CardHover'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export function Card({ interactive, className, ...props }: CardProps) {
  const card = (
    <div
      className={cn(
        'rounded-2xl border border-brand-forest/10 bg-bg-surface p-5 shadow-sm',
        className,
      )}
      {...props}
    />
  )

  return interactive ? <CardHover>{card}</CardHover> : card
}
