import type { IconProps } from '../custom/IconProps'

/** Sugarcane */
export function SugarcaneIcon({ size = 24, className }: IconProps) {
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
      <path d="M10 21V5a2.5 2.5 0 0 1 5 0v16" />
      <path d="M10 9h5" />
      <path d="M10 13h5" />
      <path d="M10 17h5" />
      <path d="M10 6C8 4.5 5.5 4 3.5 4.8 5 6.6 7.6 7.2 10 6Z" />
      <path d="M15 6c2-1.5 4.5-2 6.5-1.2C20 6.6 17.4 7.2 15 6Z" />
    </svg>
  )
}
