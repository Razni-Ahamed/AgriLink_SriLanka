import type { IconProps } from './IconProps'

export function MarketBasketIcon({ size = 24, className }: IconProps) {
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
      <path d="M5 10h14l-1.5 9a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7L5 10Z" />
      <path d="M8 10a4 4 0 0 1 8 0" />
      <path d="M8.5 13.5v4M12 13.5v4M15.5 13.5v4" />
    </svg>
  )
}
