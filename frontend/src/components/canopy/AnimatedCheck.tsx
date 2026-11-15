import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * A tick that draws itself: for "done", "approved", "sent". Pass `checked` to draw it; it plays
 * whenever it turns on. With motion off it simply appears.
 */
export function AnimatedCheck({
  checked = true,
  className,
  strokeWidth = 2.6,
}: {
  checked?: boolean
  className?: string
  strokeWidth?: number
}) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5', className)} aria-hidden="true">
      <motion.path
        d="M5 12.5l4.5 4.5L19 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      />
    </svg>
  )
}

/** A round tick-box whose ring fills and whose check draws when `checked`. */
export function TickCircle({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-flex size-7 shrink-0 items-center justify-center rounded-full border-[1.6px] transition-colors duration-200',
        checked
          ? 'border-brand-forest bg-brand-forest text-bg-surface'
          : 'border-brand-forest/70 text-transparent',
        className,
      )}
    >
      <AnimatedCheck checked={checked} className="size-4" />
    </span>
  )
}
