import type { IconProps } from '../custom/IconProps'

/** Pineapple */
export function PineappleIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 8c3.6 0 6 2.8 6 6.5S15.6 21 12 21s-6-2.8-6-6.5S8.4 8 12 8Z" />
      <path d="m8.5 11 7 7" />
      <path d="m15.5 11-7 7" />
      <path d="M12 8V4" />
      <path d="M12 4.5C10.8 2.8 8.8 2.2 7 2.8c.9 2 2.8 3 5 1.7Z" />
      <path d="M12 4.5c1.2-1.7 3.2-2.3 5-1.7-.9 2-2.8 3-5 1.7Z" />
    </svg>
  )
}
