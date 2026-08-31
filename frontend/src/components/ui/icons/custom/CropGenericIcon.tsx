import type { IconProps } from './IconProps'

export function CropGenericIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 21v-8" />
      <path d="M12 13c-4 0-6-3-6-7 4 0 6 3 6 7Z" />
      <path d="M12 13c4 0 6-3 6-7-4 0-6 3-6 7Z" />
      <path d="M4 21h16" />
    </svg>
  )
}
