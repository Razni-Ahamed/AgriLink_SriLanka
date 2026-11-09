import { create } from 'zustand'
import i18n, { isLanguageLoaded, loadLanguage } from '@/i18n/config'
import { readStoredLanguage, writeStoredLanguage, type Language } from '@/i18n/languageStorage'

function applyLanguage(language: Language): void {
  // Keeps screen readers and font/line-break rules on the right language.
  document.documentElement.lang = language
  if (isLanguageLoaded(language)) {
    void i18n.changeLanguage(language)
    return
  }
  // The page stays in the current language for the moment the new one takes to download.
  void loadLanguage(language)
    .then(() => i18n.changeLanguage(language))
    .catch(() => undefined)
}

interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
}

export const useLanguageStore = create<LanguageState>((set) => ({
  // i18next already initialized from storage, so the store starts in step
  // with what is on screen — no first-paint flash to correct.
  language: readStoredLanguage(),

  setLanguage: (language) => {
    writeStoredLanguage(language)
    applyLanguage(language)
    set({ language })
  },
}))

export function hydrateLanguage(): void {
  const language = readStoredLanguage()
  applyLanguage(language)
  useLanguageStore.setState({ language })
}
