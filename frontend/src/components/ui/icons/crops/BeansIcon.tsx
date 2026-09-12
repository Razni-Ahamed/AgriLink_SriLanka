import type { IconProps } from '../custom/IconProps'

/** Beans */
export function BeansIcon({ size = 24, className }: IconProps) {
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
      <path d="M4.5 8c4.5-3.5 11-3.5 15.5 0-4.5 8-11 8-15.5 0Z" />
      <circle cx="9" cy="9" r="1.3" />
      <circle cx="12.5" cy="10" r="1.3" />
      <circle cx="16" cy="9" r="1.3" />
      <path d="M4.5 8 3 5.5" />
    </svg>
  )
}
