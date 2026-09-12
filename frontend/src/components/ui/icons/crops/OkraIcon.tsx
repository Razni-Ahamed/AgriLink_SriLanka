import type { IconProps } from '../custom/IconProps'

/** Okra */
export function OkraIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 3.5 9.5 6" />
      <path d="M12 3.5 14.5 6" />
      <path d="M9.5 6h5l1.5 11c.2 2-1.5 3.5-4 3.5s-4.2-1.5-4-3.5Z" />
      <path d="M12 6.5v14" />
      <path d="M10.5 6.8 9.5 20.3" />
      <path d="m13.5 6.8 1 13.5" />
    </svg>
  )
}
