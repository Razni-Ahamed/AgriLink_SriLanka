import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface IconBadgeProps {
  children: ReactNode
  tone?: 'forest' | 'harvest' | 'terracotta'
  className?: string
}

const toneClasses: Record<NonNullable<IconBadgeProps['tone']>, string> = {
  forest: 'bg-brand-forest/10 text-brand-forest',
  harvest: 'bg-brand-harvest/15 text-brand-harvest',
  terracotta: 'bg-brand-terracotta/15 text-brand-terracotta',
}

export function IconBadge({ children, tone = 'forest', className }: IconBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
