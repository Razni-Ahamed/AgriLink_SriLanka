import type { IconProps } from './IconProps'

/** Leaf + circuit motif — used for AI-generated crop advisories. */
export function AIAdvisoryIcon({ size = 24, className }: IconProps) {
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
      <path d="M4 20c0-8 4-14 14-16-1 10-6 15-14 16Z" />
      <path d="M7 17h2v-3h3v-3h2" />
      <circle cx="7" cy="17" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}
