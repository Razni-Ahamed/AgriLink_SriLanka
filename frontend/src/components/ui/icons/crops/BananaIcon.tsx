import type { IconProps } from '../custom/IconProps'

/** Banana */
export function BananaIcon({ size = 24, className }: IconProps) {
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
      <path d="M4 12c0 5 4 8.5 9 8.5 4.5 0 7-2.5 8-5.5-3.5 1.5-7 1-9.5-1.5S8.5 7 9 3.5C6 5 4 8 4 12Z" />
      <path d="M9 3.5 8 6" />
    </svg>
  )
}
