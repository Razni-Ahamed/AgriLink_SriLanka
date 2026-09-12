import type { IconProps } from '../custom/IconProps'

/** Carrot */
export function CarrotIcon({ size = 24, className }: IconProps) {
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
      <path d="M8 9h8l-4 12Z" />
      <path d="M12 9V5" />
      <path d="M12 5c-1.5-2-3.5-2.5-5.5-1.5C8 5.3 10 5.8 12 5Z" />
      <path d="M12 5c1.5-2 3.5-2.5 5.5-1.5C16 5.3 14 5.8 12 5Z" />
      <path d="M9.5 13h5" />
      <path d="M10.5 16.5h3" />
    </svg>
  )
}
