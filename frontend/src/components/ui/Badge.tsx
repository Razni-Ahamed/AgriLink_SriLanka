import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  variant: BadgeVariant
  children: ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-state-success/10 text-state-success',
  warning: 'bg-brand-harvest/15 text-brand-harvest',
  danger: 'bg-state-danger/10 text-state-danger',
  info: 'bg-state-info/10 text-state-info',
  neutral: 'bg-text-secondary/10 text-text-secondary',
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
