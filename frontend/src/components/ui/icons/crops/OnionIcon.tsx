import type { IconProps } from '../custom/IconProps'

/** Onion */
export function OnionIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 7c4 2.5 6 5.5 6 8 0 3.3-2.7 5.5-6 5.5S6 18.3 6 15c0-2.5 2-5.5 6-8Z" />
      <path d="M12 7.5V20.4" />
      <path d="M9 9.8C8 12 8 16.5 10 20" />
      <path d="M15 9.8c1 2.2 1 6.7-1 10.6" />
      <path d="M12 7 10 3" />
      <path d="m12 7 2-4" />
    </svg>
  )
}
