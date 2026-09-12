import type { IconProps } from '../custom/IconProps'

/** Groundnut */
export function GroundnutIcon({ size = 24, className }: IconProps) {
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
      <path d="M15.5 3.2c2.6 1.2 3.4 4.3 1.8 6.6-.7 1-.7 2.4 0 3.4 1.6 2.3.8 5.4-1.8 6.6-2.4 1.1-5.2 0-6.2-2.4-.5-1.2-1.6-2-2.9-2.1C3.8 15.1 2.2 12.6 2.9 10c.6-2.4 3-3.9 5.4-3.4" />
      <path d="M8.5 8.5c1.5 1 2.4 2.6 2.6 4.4" />
    </svg>
  )
}
