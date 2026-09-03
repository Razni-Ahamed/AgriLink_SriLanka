export const SUPPORTED_LANGUAGES = ['en', 'si', 'ta'] as const

export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = 'en'

export const LANGUAGE_STORAGE_KEY = 'agrilink.language'

export function isSupportedLanguage(value: unknown): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language)
}

/**
 * Read synchronously so i18next can initialize in the stored language. Doing
 * this in an effect instead would render one frame in English before swapping.
 */
export function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

export function writeStoredLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // localStorage unavailable — language just won't persist across reloads
  }
}
