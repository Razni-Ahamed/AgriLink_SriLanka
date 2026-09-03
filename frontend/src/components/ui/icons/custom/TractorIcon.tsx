import type { IconProps } from './IconProps'

export function TractorIcon({ size = 24, className }: IconProps) {
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
      <path d="M3 13h4V8h3l2 3h2" />
      <path d="M14 11h3l2 2h1v3" />
      <circle cx="6" cy="17" r="2.5" />
      <circle cx="17" cy="17" r="3.5" />
      <path d="M8.5 17h5" />
    </svg>
  )
}
