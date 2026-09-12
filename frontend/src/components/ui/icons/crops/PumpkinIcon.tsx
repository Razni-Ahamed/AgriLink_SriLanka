import type { IconProps } from '../custom/IconProps'

/** Pumpkin */
export function PumpkinIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 7c5 0 8 3 8 7s-3 6.5-8 6.5S4 18 4 14s3-7 8-7Z" />
      <path d="M8.5 7.6C7 9.5 6.5 11.6 6.5 14s.5 4.4 2 6.2" />
      <path d="M15.5 7.6c1.5 1.9 2 4 2 6.4s-.5 4.4-2 6.2" />
      <path d="M12 7V4" />
      <path d="M12 4c1.5-1.5 3.5-1.5 5-.5" />
    </svg>
  )
}
