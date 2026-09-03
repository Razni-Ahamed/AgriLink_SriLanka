import { create } from 'zustand'
import i18n from '@/i18n/config'
import {
  readStoredLanguage,
  writeStoredLanguage,
  type Language,
} from '@/i18n/languageStorage'

function applyLanguage(language: Language): void {
  void i18n.changeLanguage(language)
  // Keeps screen readers and font/line-break rules on the right language.
  document.documentElement.lang = language
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
