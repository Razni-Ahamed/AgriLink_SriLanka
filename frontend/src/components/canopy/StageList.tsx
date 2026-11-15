import { cn } from '@/lib/utils'
import { AnimatedCheck } from './AnimatedCheck'

interface StageListProps {
  stages: string[]
  /** Index of the step in progress. Steps before it are done; `stages.length` means all done. */
  current: number
  className?: string
}

/**
 * Steps of a slow piece of work, so a person can see something is happening: done steps get a
 * drawn tick, the current one a spinning ring, later ones a quiet circle.
 */
export function StageList({ stages, current, className }: StageListProps) {
  return (
    <ol className={cn('flex flex-col gap-3', className)} aria-live="polite">
      {stages.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'waiting'
        return (
          <li
            key={label}
            className={cn(
              'grid grid-cols-[1.5rem_1fr] items-center gap-3 text-sm transition-colors',
              state === 'waiting' ? 'text-text-secondary' : 'text-text-primary',
            )}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full',
                state === 'done' && 'bg-brand-forest text-bg-surface',
                state === 'active' &&
                  'animate-spin border-[2.2px] border-brand-forest border-r-transparent',
                state === 'waiting' && 'border-[1.6px] border-text-primary/15',
              )}
            >
              {state === 'done' && <AnimatedCheck className="size-3.5" strokeWidth={3} />}
            </span>
            {label}
          </li>
        )
      })}
    </ol>
  )
}
