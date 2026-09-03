import type { IconProps } from './IconProps'

export function RiceGrainIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 21V9" />
      <ellipse cx="9" cy="7.5" rx="1.6" ry="2.4" transform="rotate(-30 9 7.5)" />
      <ellipse cx="15" cy="7.5" rx="1.6" ry="2.4" transform="rotate(30 15 7.5)" />
      <ellipse cx="12" cy="4.5" rx="1.6" ry="2.4" />
    </svg>
  )
}
