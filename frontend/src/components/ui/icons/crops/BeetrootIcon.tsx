import type { IconProps } from '../custom/IconProps'

/** Beetroot */
export function BeetrootIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 9c3.9 0 6.5 2.4 6.5 5.2 0 3-3 6.3-6.5 6.3S5.5 17.2 5.5 14.2C5.5 11.4 8.1 9 12 9Z" />
      <path d="M12 9V4.5" />
      <path d="M12 5.5C10.6 3.8 8.4 3.1 6.5 3.8 7.8 5.7 9.9 6.4 12 5.5Z" />
      <path d="M12 5.5c1.4-1.7 3.6-2.4 5.5-1.7-1.3 1.9-3.4 2.6-5.5 1.7Z" />
      <path d="M12 20.5V23" />
    </svg>
  )
}
