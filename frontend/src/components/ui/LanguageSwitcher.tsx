import { useTranslation } from 'react-i18next'
import { Translate } from '@/components/ui/icons'
import { SUPPORTED_LANGUAGES, type Language } from '@/i18n/config'
import { useLanguageStore } from '@/lib/useLanguageStore'
import { cn } from '@/lib/utils'

const LANGUAGE_LABEL_KEYS = {
  en: 'language.en',
  si: 'language.si',
  ta: 'language.ta',
} as const satisfies Record<Language, string>

interface LanguageSwitcherProps {
  /** `full` shows the language names, `compact` fits the app header. */
  variant?: 'full' | 'compact'
  className?: string
}

export function LanguageSwitcher({ variant = 'full', className }: LanguageSwitcherProps) {
  const { t } = useTranslation()
  const language = useLanguageStore((state) => state.language)
  const setLanguage = useLanguageStore((state) => state.setLanguage)

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className={cn(
        'flex items-center gap-1 rounded-xl border border-brand-forest/15 bg-bg-canvas p-1',
        className,
      )}
    >
      {variant === 'full' && (
        <Translate size={16} weight="duotone" className="ml-1 shrink-0 text-text-secondary" />
      )}
      {SUPPORTED_LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLanguage(code)}
          aria-pressed={language === code}
          className={cn(
            'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
            language === code
              ? 'bg-brand-forest text-bg-surface'
              : 'text-text-secondary hover:bg-brand-forest/10 hover:text-brand-forest',
          )}
        >
          {t(LANGUAGE_LABEL_KEYS[code])}
        </button>
      ))}
    </div>
  )
}
