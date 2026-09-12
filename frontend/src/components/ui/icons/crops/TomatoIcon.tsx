import type { IconProps } from '../custom/IconProps'

/** Tomato */
export function TomatoIcon({ size = 24, className }: IconProps) {
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
      <circle cx="12" cy="14" r="7" />
      <path d="M12 7V5" />
      <path d="M12 7 8.5 4.5" />
      <path d="M12 7l3.5-2.5" />
      <path d="M12 7 9.5 7.5" />
      <path d="m12 7 2.5.5" />
    </svg>
  )
}
