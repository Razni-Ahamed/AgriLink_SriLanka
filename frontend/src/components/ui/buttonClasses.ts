import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

// One filled button per screen (primary); everything else is an outline that sits quietly on
// glass or a card (secondary), or plain text (ghost).
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-forest text-bg-surface shadow-sm hover:bg-brand-forest-light',
  secondary:
    'border border-text-primary/15 bg-bg-surface/70 text-text-primary hover:border-brand-forest/40 hover:bg-bg-surface',
  ghost: 'bg-transparent text-brand-forest hover:bg-brand-forest/10',
  danger: 'bg-state-danger text-bg-surface shadow-sm hover:brightness-95',
}

// Minimum heights rather than fixed ones, so a long Sinhala or Tamil label can wrap. `md` and
// `lg` meet the 44 px touch-target guideline.
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-4 py-1.5 text-xs',
  md: 'min-h-11 px-5 py-2 text-sm',
  lg: 'min-h-12 px-6 py-2.5 text-base',
}

/**
 * The button look on its own — `Button` uses it, and so can a router `Link` that should read as
 * a button (wrapping a `<Button>` in a link nests one interactive element inside another).
 * Its own module so Button.tsx exports only components, which fast refresh needs.
 */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    className,
  )
}
