import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface SeasonVineProps {
  /** 0–1: how far through the season the crop is. */
  fraction: number
  /** Read by screen readers ("Paddy: day 64 of 105"). */
  label: string
  className?: string
}

const WIDTH = 300
const HEIGHT = 46
const MID = 24
const AMPLITUDE = 10

/** The vine's centre line: a gentle wave across the card. */
function waveY(x: number) {
  return MID + AMPLITUDE * Math.sin((x / WIDTH) * Math.PI * 2.6)
}

// Sampled once; 60 points is smooth at any card width.
const points = Array.from({ length: 61 }, (_, index) => {
  const x = 6 + (index / 60) * (WIDTH - 12)
  return [x, waveY(x)] as const
})
const PATH = points
  .map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
  .join(' ')

/** Leaves sprout along the vine at these points of the season. */
const LEAF_AT = [0.2, 0.4, 0.6, 0.8]

/**
 * A crop's season drawn as a vine that grows to today. Leaves sprout as it passes each fifth of
 * the season, and the ring at the end is the harvest. The growth plays once when the card
 * appears; with motion off it is simply drawn.
 */
export function SeasonVine({ fraction, label, className }: SeasonVineProps) {
  const progress = Math.min(Math.max(fraction, 0), 1)
  const end = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
      className={cn('block h-11 w-full overflow-visible', className)}
      preserveAspectRatio="none"
    >
      <path
        d={PATH}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.18}
        strokeWidth={3}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <motion.path
        d={PATH}
        fill="none"
        stroke="var(--color-brand-forest)"
        strokeWidth={3.4}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: progress }}
        transition={{ duration: 1.4, ease: [0.3, 0.7, 0.2, 1], delay: 0.15 }}
      />
      {LEAF_AT.filter((at) => at <= progress).map((at, index) => {
        const x = 6 + at * (WIDTH - 12)
        const y = waveY(x)
        const up = index % 2 === 0 ? -1 : 1
        return (
          <motion.path
            key={at}
            d={`M${x} ${y} q 4 ${up * 12} 13 ${up * 13} q -1 ${-up * 10} -13 ${-up * 13} Z`}
            fill="var(--color-brand-forest)"
            style={{ transformBox: 'fill-box', transformOrigin: up < 0 ? '0% 100%' : '0% 0%' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 16,
              delay: 0.15 + (1.4 * at) / Math.max(progress, 0.01),
            }}
          />
        )
      })}
      <circle
        cx={end[0]}
        cy={end[1]}
        r={6}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.5}
        strokeWidth={1.4}
        strokeDasharray="2 3"
      />
    </svg>
  )
}
