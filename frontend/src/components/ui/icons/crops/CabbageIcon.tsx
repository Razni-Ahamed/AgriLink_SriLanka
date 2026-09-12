import type { IconProps } from '../custom/IconProps'

/** Cabbage */
export function CabbageIcon({ size = 24, className }: IconProps) {
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
      <circle cx="12" cy="13" r="8" />
      <path d="M12 5c-3 2.5-4.5 5.5-4.5 8S9 20.5 12 21" />
      <path d="M12 5c3 2.5 4.5 5.5 4.5 8S15 20.5 12 21" />
      <path d="M4.5 11c2.5 1.5 5 2 7.5 2s5-.5 7.5-2" />
    </svg>
  )
}
