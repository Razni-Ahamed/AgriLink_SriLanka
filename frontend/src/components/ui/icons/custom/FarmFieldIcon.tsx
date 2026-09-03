import type { IconProps } from './IconProps'

export function FarmFieldIcon({ size = 24, className }: IconProps) {
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
      <path d="M4 11l5-4 5 4v8H4z" />
      <path d="M9 19v-5h2v5" />
      <path d="M15 13h5v6h-5" />
      <path d="M2 19h20" />
    </svg>
  )
}
