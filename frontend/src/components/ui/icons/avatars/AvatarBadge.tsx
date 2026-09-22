import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface AvatarIllustrationProps {
  size?: number | string
  className?: string
}

interface AvatarBadgeProps extends AvatarIllustrationProps {
  /** A theme text token (e.g. `text-brand-forest`) — the badge tint and the motif both follow it. */
  toneClassName: string
  children: ReactNode
}

/**
 * The shared shell of the default avatars: a circle tinted with the role's colour and the role's
 * motif drawn in that colour on top. Everything is `currentColor`, like the custom icons, so the
 * light/dark theme tokens recolour it with no dark-mode overrides.
 */
export function AvatarBadge({ size = 40, className, toneClassName, children }: AvatarBadgeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={cn(toneClassName, className)}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="24" cy="24" r="24" fill="currentColor" fillOpacity={0.14} />
      <circle cx="24" cy="24" r="23" fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={2} />
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  )
}
