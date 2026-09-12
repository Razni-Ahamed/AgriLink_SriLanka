import type { IconProps } from '../custom/IconProps'

/** Brinjal */
export function BrinjalIcon({ size = 24, className }: IconProps) {
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
      <path d="M14.5 8c2.8 1.3 4.5 4 4.5 7 0 3.3-2.9 5.5-6.5 5.5S6 18.3 6 15c0-3.5 3-7 8.5-7Z" />
      <path d="M14.5 8 13 4.5" />
      <path d="M13 4.5c-1.4-.6-2.9-.4-4 .6 1.2 1 2.7 1.2 4-.6Z" />
      <path d="M13 4.5c1.4-.6 2.9-.4 4 .6-1.2 1-2.7 1.2-4-.6Z" />
    </svg>
  )
}
