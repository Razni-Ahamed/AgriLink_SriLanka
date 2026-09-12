import type { IconProps } from '../custom/IconProps'

/** Sweet Potato */
export function SweetPotatoIcon({ size = 24, className }: IconProps) {
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
      <path d="M4 17c0-5 4-10 9.5-11.5C17 4.5 20 6 20 9c0 5-5 11-10.5 11C6 20 4 19 4 17Z" />
      <path d="M13.5 5.5c.5-1.5 2-2.5 3.5-2.5" />
      <circle cx="10" cy="12" r=".7" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="14" r=".7" fill="currentColor" stroke="none" />
    </svg>
  )
}
