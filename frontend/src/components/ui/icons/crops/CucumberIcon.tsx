import type { IconProps } from '../custom/IconProps'

/** Cucumber */
export function CucumberIcon({ size = 24, className }: IconProps) {
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
      <path d="M17.5 4.5c2 2 2 5.5-1.5 9l-5 5c-3 3-6.5 3-8 1.5s-1.5-5 1.5-8l5-5c3.5-3.5 6-3.5 8-2.5Z" />
      <circle cx="9" cy="14" r=".7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="11" r=".7" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="8.5" r=".7" fill="currentColor" stroke="none" />
    </svg>
  )
}
