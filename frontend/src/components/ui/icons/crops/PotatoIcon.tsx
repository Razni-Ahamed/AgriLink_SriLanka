import type { IconProps } from '../custom/IconProps'

/** Potato */
export function PotatoIcon({ size = 24, className }: IconProps) {
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
      <path d="M6.5 6.5c3.5-3 9-2.5 11 1s.5 9-3.5 11-9 1-10.5-3 0-7 3-9Z" />
      <circle cx="9.5" cy="10" r=".7" fill="currentColor" stroke="none" />
      <circle cx="14" cy="9.5" r=".7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r=".7" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="14.5" r=".7" fill="currentColor" stroke="none" />
    </svg>
  )
}
