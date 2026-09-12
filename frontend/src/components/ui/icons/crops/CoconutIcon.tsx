import type { IconProps } from '../custom/IconProps'

/** Coconut */
export function CoconutIcon({ size = 24, className }: IconProps) {
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
      <circle cx="12" cy="14.5" r="6.5" />
      <circle cx="10" cy="13" r=".6" fill="currentColor" stroke="none" />
      <circle cx="14" cy="13" r=".6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16" r=".6" fill="currentColor" stroke="none" />
      <path d="M12 8V5" />
      <path d="M12 5c-1.5-2-4-2.5-6-1.5 1.5 1.8 3.8 2.3 6 1.5Z" />
      <path d="M12 5c1.5-2 4-2.5 6-1.5-1.5 1.8-3.8 2.3-6 1.5Z" />
    </svg>
  )
}
