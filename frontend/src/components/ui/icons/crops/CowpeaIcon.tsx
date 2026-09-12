import type { IconProps } from '../custom/IconProps'

/** Cowpea */
export function CowpeaIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 4c7 1.5 12 6.5 14 16" />
      <path d="M8 4.8c6 1.8 10.2 6.4 12 14.4" />
      <path d="M9.5 8.5c.8.6 1.4 1.4 1.8 2.4" />
      <path d="M12.5 12.5c.8.7 1.4 1.6 1.8 2.6" />
    </svg>
  )
}
