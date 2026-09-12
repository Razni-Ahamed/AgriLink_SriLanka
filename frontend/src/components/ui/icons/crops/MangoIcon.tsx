import type { IconProps } from '../custom/IconProps'

/** Mango */
export function MangoIcon({ size = 24, className }: IconProps) {
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
      <path d="M15 6.5c3 1.5 4.5 4.5 4 7.5-.6 3.8-4 6.5-7.5 6.5-3 0-5.5-2-5.5-5.5C6 10 10 6.5 15 6.5Z" />
      <path d="M15 6.5 13.5 3.5" />
      <path d="M13.5 3.5c1.8-1.2 4.2-1 5.8.5-1.7 1.5-4.1 1.7-5.8-.5Z" />
    </svg>
  )
}
