import { useId, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { spring } from '@/lib/motion'
import { cn } from '@/lib/utils'

export interface ChipOption<T extends string> {
  value: T
  label: string
  /** Optional leading icon. */
  icon?: ReactNode
}

interface ChipGroupProps<T extends string> {
  options: readonly ChipOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Names the group for screen readers ("Theme", "Account type"). */
  label: string
  size?: 'sm' | 'md'
  /** Stretch so every chip shares the width equally (a two-way choice on a form). */
  fill?: boolean
  className?: string
}

/**
 * One choice out of a few, as pills. The selected pill is filled, and the fill slides to the new
 * choice with a spring, so it's always obvious which one is on. Each chip is a real button with
 * `aria-pressed`, so keyboards and screen readers get the same information.
 */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  fill = false,
  className,
}: ChipGroupProps<T>) {
  // Scoped, so two groups on one page never slide into each other.
  const pillId = useId()

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-text-primary/10 bg-bg-surface/60 p-1',
        fill && 'flex w-full',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/60',
              size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
              fill && 'flex-1',
              isActive
                ? 'text-bg-surface'
                : 'text-text-secondary hover:bg-brand-forest/[0.08] hover:text-text-primary',
            )}
          >
            {isActive && (
              <motion.span
                layoutId={pillId}
                transition={spring.move}
                className="absolute inset-0 rounded-full bg-brand-forest shadow-sm"
                aria-hidden="true"
              />
            )}
            {option.icon && <span className="relative flex shrink-0">{option.icon}</span>}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
