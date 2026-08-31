import type { IconProps } from './IconProps'

export function TeaLeafIcon({ size = 24, className }: IconProps) {
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
      <path d="M4 20c0-8 4-14 14-16-1 10-6 15-14 16Z" />
      <path d="M6 18c3-4 6-7 11-11" />
    </svg>
  )
}
