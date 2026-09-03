import type { IconProps } from './IconProps'

export function HarvestScaleIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 3v17" />
      <path d="M7 20h10" />
      <path d="M4 7h16" />
      <path d="M7 7l-2.5 5c0 1.8 1.4 3 3 3s3-1.2 3-3L8 7" />
      <path d="M17 7l-2.5 5c0 1.8 1.4 3 3 3s3-1.2 3-3L18 7" />
    </svg>
  )
}
