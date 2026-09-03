import type { IconProps } from './IconProps'

export function SeedlingIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 20v-6" />
      <path d="M12 14c-3 0-5-2-5-5 3 0 5 2 5 5Z" />
      <path d="M6 20h12l-1.5-4h-9z" />
    </svg>
  )
}
