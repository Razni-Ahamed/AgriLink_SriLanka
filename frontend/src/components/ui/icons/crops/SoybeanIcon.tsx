import type { IconProps } from '../custom/IconProps'

/** Soybean */
export function SoybeanIcon({ size = 24, className }: IconProps) {
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
      <path d="M6 16.5c-1.5-4 1-8.5 5-10.5 3.5-1.8 6.5-.5 7 2" />
      <circle cx="9" cy="12.5" r="1.6" />
      <circle cx="13" cy="9.5" r="1.6" />
      <path d="M7 20c3.5 1 7-.5 9-3.5" />
    </svg>
  )
}
