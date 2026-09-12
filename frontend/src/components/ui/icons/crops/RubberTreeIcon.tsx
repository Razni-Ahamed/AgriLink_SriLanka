import type { IconProps } from '../custom/IconProps'

/** Rubber */
export function RubberTreeIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 21v-7" />
      <path d="M12 14c-4 0-6.5-2.4-6.5-5.5S8 3 12 3s6.5 2.4 6.5 5.5S16 14 12 14Z" />
      <path d="M9.5 15.5c1.6 1.2 3.4 1.2 5 0" />
      <path d="M9 18h2.5a1.5 1.5 0 0 1 0 3H9Z" />
    </svg>
  )
}
