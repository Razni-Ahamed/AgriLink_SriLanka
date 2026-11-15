import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { CardHover } from './motion/CardHover'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

/**
 * A solid surface for work: forms, lists, details. Pass `glass` in className for a see-through
 * glass panel instead (it then skips the solid fill, border and shadow, which glass brings itself).
 */
export function Card({ interactive, className, ...props }: CardProps) {
  const isGlass = className?.split(/\s+/).includes('glass') ?? false
  const card = (
    <div
      className={cn(
        'rounded-[22px] p-5',
        !isGlass && 'border border-text-primary/[0.08] bg-bg-surface shadow-sm',
        className,
      )}
      {...props}
    />
  )

  return interactive ? <CardHover>{card}</CardHover> : card
}
