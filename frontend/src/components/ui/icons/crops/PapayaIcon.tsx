import type { IconProps } from '../custom/IconProps'

/** Papaya */
export function PapayaIcon({ size = 24, className }: IconProps) {
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
      <path d="M12 3c4.4 1.6 7 5.6 7 10 0 4.4-3 7.5-7 7.5S5 17.4 5 13c0-4.4 2.6-8.4 7-10Z" />
      <circle cx="12" cy="14" r="3.2" />
      <circle cx="11" cy="13.2" r=".55" fill="currentColor" stroke="none" />
      <circle cx="13" cy="13.4" r=".55" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15.2" r=".55" fill="currentColor" stroke="none" />
    </svg>
  )
}
