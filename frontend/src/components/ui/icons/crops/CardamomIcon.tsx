import type { IconProps } from '../custom/IconProps'

/** Cardamom */
export function CardamomIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 3c3.5 3 5 6.5 5 9.5 0 4-2.2 8.5-5 8.5s-5-4.5-5-8.5C7 9.5 8.5 6 12 3Z" />
      <path d="M12 5.5v14" />
      <path d="M9 9c2 1.2 4 1.2 6 0" />
      <path d="M8.3 14c2.4 1.4 4.9 1.4 7.4 0" />
    </svg>
  )
}
