import type { IconProps } from '../custom/IconProps'

/** Cinnamon */
export function CinnamonIcon({ size = 24, className }: IconProps) {
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
      <path d="M7 4h10a3 3 0 0 1 0 6H7a3 3 0 0 1 0-6Z" />
      <path d="M7 14h10a3 3 0 0 1 0 6H7a3 3 0 0 1 0-6Z" />
      <path d="M7 4a3 3 0 0 0 0 6" />
      <path d="M7 14a3 3 0 0 0 0 6" />
    </svg>
  )
}
