import type { IconProps } from '../custom/IconProps'

/** Leeks */
export function LeeksIcon({ size = 24, className }: IconProps) {
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
      <path d="M9.5 21v-9a2.5 2.5 0 0 1 5 0v9Z" />
      <path d="M9.5 12 6 4" />
      <path d="M12 12V3" />
      <path d="m14.5 12 3.5-8" />
      <path d="M9.5 17h5" />
    </svg>
  )
}
