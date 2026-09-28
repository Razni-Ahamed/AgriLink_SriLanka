import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

// Material Symbols "eco" (Apache 2.0): the same leaf as the tab icon and the Android app icon.
const LEAF =
  'M6.05 8.05c-2.73 2.73-2.73 7.15-.02 9.88 1.47-3.4 4.09-6.24 7.36-7.93-2.77 2.34-4.71 5.61-5.39 9.32 2.6 1.23 5.8.78 7.95-1.37C19.43 14.47 20 4 20 4S9.53 4.57 6.05 8.05z'

/**
 * The AgriLink logo: the leaf on a soft green tile, then the name. Drawn from theme tokens, so the
 * leaf goes from deep green in light mode to bright green in dark mode, like the rest of the brand.
 */
export function BrandMark({
  className,
  nameClassName,
}: {
  className?: string
  nameClassName?: string
}) {
  const { t } = useTranslation()
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-forest/12 text-brand-forest"
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="currentColor">
          <path d={LEAF} />
        </svg>
      </span>
      <span className={cn('font-display text-2xl leading-none text-brand-forest', nameClassName)}>
        {t('appName')}
      </span>
    </span>
  )
}
