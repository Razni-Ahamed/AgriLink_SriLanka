import type { IconProps } from '../custom/IconProps'

/** Chilli */
export function ChilliIcon({ size = 24, className }: IconProps) {
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
      <path d="M9 3.5c0 2 1 3 2.5 3.5" />
      <path d="M11.5 7c4 .5 7 4 7 7.5 0 3.5-3 6-6.5 6-4 0-7.5-3-7.5-7 0-1.6 1-3 2.5-3s2.5 1.2 2.5 2.5" />
    </svg>
  )
}
