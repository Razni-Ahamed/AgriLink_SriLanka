import type { IconProps } from '../custom/IconProps'

/** Avocado */
export function AvocadoIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 3c3.3 0 5.5 2.6 5.5 5.6 0 2-.8 3.2-.8 5.4 0 3.8-2 6.5-4.7 6.5s-4.7-2.7-4.7-6.5c0-2.2-.8-3.4-.8-5.4C6.5 5.6 8.7 3 12 3Z" />
      <circle cx="12" cy="13.5" r="2.8" />
    </svg>
  )
}
