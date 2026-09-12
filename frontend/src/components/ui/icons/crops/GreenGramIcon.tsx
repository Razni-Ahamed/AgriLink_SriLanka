import type { IconProps } from '../custom/IconProps'

/** Green Gram */
export function GreenGramIcon({ size = 24, className }: IconProps) {
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
      <path d="M4 13c4-5 12-5 16 0-4 5-12 5-16 0Z" />
      <circle cx="9" cy="13" r="1.5" />
      <circle cx="15" cy="13" r="1.5" />
      <path d="M4 13 2.5 9.5" />
    </svg>
  )
}
