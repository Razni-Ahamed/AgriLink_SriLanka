import type { IconProps } from './IconProps'

export function CloudRainIcon({ size = 24, className }: IconProps) {
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
      <path d="M6.5 16a4 4 0 0 1 .3-8 5 5 0 0 1 9.6-1.5A4.5 4.5 0 0 1 17 16H6.5Z" />
      <path d="M8 19l-1 2" />
      <path d="M12 19l-1 2" />
      <path d="M16 19l-1 2" />
    </svg>
  )
}
