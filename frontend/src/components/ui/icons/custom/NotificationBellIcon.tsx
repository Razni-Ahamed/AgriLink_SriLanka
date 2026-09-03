import type { IconProps } from './IconProps'

/** Bell with a filled unread dot — distinct from the plain Phosphor Bell used elsewhere in the UI. */
export function NotificationBellIcon({ size = 24, className }: IconProps) {
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
      <path d="M6 17v-5a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
      <circle cx="18" cy="6" r="3" fill="currentColor" stroke="none" />
    </svg>
  )
}
