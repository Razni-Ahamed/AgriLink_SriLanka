import type { IconProps } from '../custom/IconProps'

/** Cassava */
export function CassavaIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 3v4" />
      <path d="M12 7c-1.5 3-3 7.5-3.5 13" />
      <path d="M12 7c1.5 3 3 7.5 3.5 13" />
      <path d="M12 7.5V20" />
      <path d="M12 3c-1.6-1.2-3.6-1.4-5.4-.6C7.8 4.2 10 4.4 12 3Z" />
      <path d="M12 3c1.6-1.2 3.6-1.4 5.4-.6C16.2 4.2 14 4.4 12 3Z" />
    </svg>
  )
}
