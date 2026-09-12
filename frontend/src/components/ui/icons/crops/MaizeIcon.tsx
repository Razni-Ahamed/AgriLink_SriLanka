import type { IconProps } from '../custom/IconProps'

/** Maize */
export function MaizeIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 21V9" />
      <path d="M12 3c2.8 1.6 4 4.3 4 7.5S14.8 17 12 18.5C9.2 17 8 14.2 8 10.5S9.2 4.6 12 3Z" />
      <path d="M9 8.5h6" />
      <path d="M9 12h6" />
      <path d="M9.5 15.5h5" />
      <path d="M12 21c-2.4 0-4.4-1.5-5-3.6 2.4-.6 4.6.6 5 3.6Z" />
    </svg>
  )
}
