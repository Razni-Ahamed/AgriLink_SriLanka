import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enAuth from './locales/en/auth.json'
import enCommon from './locales/en/common.json'
import enFarms from './locales/en/farms.json'
import enHome from './locales/en/home.json'
import enIssues from './locales/en/issues.json'
import enMarketplace from './locales/en/marketplace.json'
import enMessages from './locales/en/messages.json'
import enOfficer from './locales/en/officer.json'
import enOrders from './locales/en/orders.json'
import enRegistrations from './locales/en/registrations.json'

import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  readStoredLanguage,
  type Language,
} from './languageStorage'

export {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  readStoredLanguage,
  writeStoredLanguage,
  type Language,
} from './languageStorage'

/**
 * BCP 47 tags for Intl (dates, numbers). Sri Lankan regional variants so
 * currency/date conventions stay local regardless of the UI language.
 */
const INTL_LOCALES: Record<Language, string> = {
  en: 'en-LK',
  si: 'si-LK',
  ta: 'ta-LK',
}

/** Locale tag for the active language, for Intl-based formatting helpers. */
export function currentIntlLocale(): string {
  const language = i18n.resolvedLanguage ?? i18n.language
  return INTL_LOCALES[isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE]
}

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    farms: enFarms,
    home: enHome,
    issues: enIssues,
    marketplace: enMarketplace,
    messages: enMessages,
    officer: enOfficer,
    orders: enOrders,
    registrations: enRegistrations,
  },
} as const

/**
 * Sinhala and Tamil are about 200 KB of text that English readers never need, so each is its own
 * file, fetched the first time that language is wanted. English is always bundled: it is the
 * default and every other language's fallback.
 */
const languageLoaders: Record<
  Exclude<Language, 'en'>,
  () => Promise<{ default: Record<string, object> }>
> = {
  si: () => import('./locales/si/index'),
  ta: () => import('./locales/ta/index'),
}

export function isLanguageLoaded(language: Language): boolean {
  return language === 'en' || i18n.hasResourceBundle(language, 'common')
}

/** Fetches a language's text if it isn't here yet. Safe to call repeatedly. */
export async function loadLanguage(language: Language): Promise<void> {
  if (language === 'en' || isLanguageLoaded(language)) return
  const { default: namespaces } = await languageLoaders[language]()
  for (const [namespace, bundle] of Object.entries(namespaces)) {
    i18n.addResourceBundle(language, namespace, bundle, true, true)
  }
}

void i18n.use(initReactI18next).init({
  resources,
  // Sinhala and Tamil are added later by loadLanguage.
  partialBundledLanguages: true,
  // Start in the stored language so the first paint is already correct —
  // hydrating this in an effect caused a visible flash of English.
  lng: readStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  ns: [
    'common',
    'auth',
    'farms',
    'home',
    'issues',
    'marketplace',
    'messages',
    'officer',
    'orders',
    'registrations',
  ],
  // React escapes interpolated values already.
  interpolation: { escapeValue: false },
})

/**
 * The stored language's text, started now so it downloads alongside the rest of the app.
 * main.tsx waits for it before the first render, so a Sinhala or Tamil reader never sees English
 * first. A failed download (offline) resolves anyway, leaving English until the next try.
 */
export const storedLanguageReady: Promise<void> = loadLanguage(readStoredLanguage()).catch(
  () => undefined,
)

export default i18n
