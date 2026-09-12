import type { IconProps } from '../custom/IconProps'

/** Passion Fruit */
export function PassionFruitIcon({ size = 24, className }: IconProps) {
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
      <circle cx="12" cy="12.5" r="8.5" />
      <circle cx="12" cy="12.5" r="5" />
      <circle cx="10.3" cy="11.3" r=".6" fill="currentColor" stroke="none" />
      <circle cx="13.6" cy="11.4" r=".6" fill="currentColor" stroke="none" />
      <circle cx="11" cy="14.2" r=".6" fill="currentColor" stroke="none" />
      <circle cx="13.8" cy="14" r=".6" fill="currentColor" stroke="none" />
    </svg>
  )
}
