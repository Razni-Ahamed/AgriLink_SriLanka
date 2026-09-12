import { useId } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Desktop, Moon, Sun } from '@/components/ui/icons'
import { useUiStore } from '@/lib/useUiStore'
import { THEME_PREFERENCES, type ThemePreference } from '@/lib/themeStorage'
import { cn } from '@/lib/utils'

const OPTIONS = {
  light: { labelKey: 'theme.light', Icon: Sun },
  dark: { labelKey: 'theme.dark', Icon: Moon },
  system: { labelKey: 'theme.system', Icon: Desktop },
} as const satisfies Record<ThemePreference, { labelKey: string; Icon: typeof Sun }>

// Light → System → Dark reads as a ramp from brightest to darkest, so the
// control has an obvious direction rather than an arbitrary order.
const ORDER: readonly ThemePreference[] = ['light', 'system', 'dark']

interface ThemeToggleProps {
  /** `full` shows the mode names, `compact` is icon-only for the app header. */
  variant?: 'full' | 'compact'
  className?: string
}

export function ThemeToggle({ variant = 'full', className }: ThemeToggleProps) {
  const { t } = useTranslation()
  const themePreference = useUiStore((state) => state.themePreference)
  const setThemePreference = useUiStore((state) => state.setThemePreference)
  // Scoped so two mounted toggles can't animate into each other's pill.
  const pillId = useId()

  return (
    <div
      role="group"
      aria-label={t('theme.label')}
      className={cn(
        'flex items-center gap-1 rounded-xl border border-brand-forest/15 bg-bg-canvas p-1',
        className,
      )}
    >
      {ORDER.map((preference) => {
        const { labelKey, Icon } = OPTIONS[preference]
        const isActive = themePreference === preference
        const label = t(labelKey)

        return (
          <button
            key={preference}
            type="button"
            onClick={() => setThemePreference(preference)}
            aria-pressed={isActive}
            // The icon alone carries the meaning in `compact`, so name the
            // button for screen readers and pointer users either way.
            aria-label={label}
            title={label}
            className={cn(
              'relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'text-bg-surface'
                : 'text-text-secondary hover:bg-brand-forest/10 hover:text-brand-forest',
            )}
          >
            {isActive && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-lg bg-brand-forest"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <Icon
              size={14}
              weight={isActive ? 'fill' : 'duotone'}
              className="relative shrink-0"
              aria-hidden="true"
            />
            {variant === 'full' && <span className="relative">{label}</span>}
          </button>
        )
      })}
    </div>
  )
}

// Re-exported so callers can iterate the same source of truth the store uses.
export { THEME_PREFERENCES }
