import type { IconProps } from '../custom/IconProps'

/** Pepper */
export function PepperIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 3v18" />
      <circle cx="8.5" cy="7" r="2" />
      <circle cx="15.5" cy="10" r="2" />
      <circle cx="8.5" cy="13.5" r="2" />
      <circle cx="15.5" cy="17" r="2" />
    </svg>
  )
}
