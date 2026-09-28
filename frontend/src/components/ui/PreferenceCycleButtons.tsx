import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Desktop, Moon, Sun } from '@/components/ui/icons'
import { SUPPORTED_LANGUAGES, type Language } from '@/i18n/config'
import type { ThemePreference } from '@/lib/themeStorage'
import { useLanguageStore } from '@/lib/useLanguageStore'
import { useUiStore } from '@/lib/useUiStore'
import { cn } from '@/lib/utils'
import { headerButtonClass, opensOnHover, slide } from './headerButtonStyles'

// Each language in its own script, which its readers spot faster than "SI" or "TA".
const LANGUAGE_BADGES = { en: 'EN', si: 'සිං', ta: 'த' } as const satisfies Record<Language, string>
const LANGUAGE_LABEL_KEYS = {
  en: 'language.en',
  si: 'language.si',
  ta: 'language.ta',
} as const satisfies Record<Language, string>

// Light → System → Dark, brightest to darkest, then round again.
const THEMES = {
  light: { labelKey: 'theme.light', Icon: Sun },
  system: { labelKey: 'theme.system', Icon: Desktop },
  dark: { labelKey: 'theme.dark', Icon: Moon },
} as const satisfies Record<ThemePreference, { labelKey: string; Icon: typeof Sun }>
const THEME_ORDER: readonly ThemePreference[] = ['light', 'system', 'dark']

function next<T>(options: readonly T[], current: T): T {
  return options[(options.indexOf(current) + 1) % options.length]
}

const closesOnHover =
  'grid-cols-[1fr] opacity-100 group-hover:grid-cols-[0fr] group-hover:opacity-0 group-focus-visible:grid-cols-[0fr] group-focus-visible:opacity-0'

/** Swaps the button's face with a short upward slide, so a click visibly changes something. */
function CycleFace({ faceKey, children }: { faceKey: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={faceKey}
        initial={reduceMotion ? false : { y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { y: -14, opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="flex items-center justify-center"
      >
        {children}
      </motion.span>
    </AnimatePresence>
  )
}

/**
 * One button for the language: shows the current one ("EN"), widening to its full name on hover,
 * and each click moves on to the next (English → Sinhala → Tamil → English). Its accessible name
 * says what's chosen and what a click picks.
 */
export function LanguageCycleButton({ className }: { className?: string }) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const setLanguage = useLanguageStore((state) => state.setLanguage)
  const upcoming = next(SUPPORTED_LANGUAGES, language)
  const name = t(LANGUAGE_LABEL_KEYS[language])
  const label = `${t('language.label')}: ${name} → ${t(LANGUAGE_LABEL_KEYS[upcoming])}`

  return (
    <button
      type="button"
      onClick={() => setLanguage(upcoming)}
      aria-label={label}
      title={label}
      className={cn(headerButtonClass, 'text-sm font-semibold', className)}
    >
      <CycleFace faceKey={language}>
        {/* The short form and the full name trade places, so the button grows to fit the name. */}
        <span lang={language} className={cn(slide, closesOnHover)} aria-hidden="true">
          <span className="overflow-hidden whitespace-nowrap">{LANGUAGE_BADGES[language]}</span>
        </span>
        <span lang={language} className={cn(slide, opensOnHover)} aria-hidden="true">
          <span className="overflow-hidden whitespace-nowrap">{name}</span>
        </span>
      </CycleFace>
    </button>
  )
}

/** One button for the theme, cycling Light → System → Dark: the current one's icon, and its name on hover. */
export function ThemeCycleButton({ className }: { className?: string }) {
  const { t } = useTranslation()
  const themePreference = useUiStore((state) => state.themePreference)
  const setThemePreference = useUiStore((state) => state.setThemePreference)
  const upcoming = next(THEME_ORDER, themePreference)
  const { labelKey, Icon } = THEMES[themePreference]
  const label = `${t('theme.label')}: ${t(labelKey)} → ${t(THEMES[upcoming].labelKey)}`

  return (
    <button
      type="button"
      onClick={() => setThemePreference(upcoming)}
      aria-label={label}
      title={label}
      className={cn(headerButtonClass, 'text-sm font-medium', className)}
    >
      <CycleFace faceKey={themePreference}>
        <Icon size={20} weight="duotone" aria-hidden="true" className="shrink-0" />
        <span
          className={cn(slide, opensOnHover, 'ml-0 group-hover:ml-2 group-focus-visible:ml-2')}
          aria-hidden="true"
        >
          <span className="overflow-hidden whitespace-nowrap">{t(labelKey)}</span>
        </span>
      </CycleFace>
    </button>
  )
}
