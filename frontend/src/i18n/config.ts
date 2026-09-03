import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enAuth from './locales/en/auth.json'
import enCommon from './locales/en/common.json'
import enFarms from './locales/en/farms.json'
import enMarketplace from './locales/en/marketplace.json'
import enOrders from './locales/en/orders.json'

import siAuth from './locales/si/auth.json'
import siCommon from './locales/si/common.json'
import siFarms from './locales/si/farms.json'
import siMarketplace from './locales/si/marketplace.json'
import siOrders from './locales/si/orders.json'

import taAuth from './locales/ta/auth.json'
import taCommon from './locales/ta/common.json'
import taFarms from './locales/ta/farms.json'
import taMarketplace from './locales/ta/marketplace.json'
import taOrders from './locales/ta/orders.json'

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
    marketplace: enMarketplace,
    orders: enOrders,
  },
  si: {
    common: siCommon,
    auth: siAuth,
    farms: siFarms,
    marketplace: siMarketplace,
    orders: siOrders,
  },
  ta: {
    common: taCommon,
    auth: taAuth,
    farms: taFarms,
    marketplace: taMarketplace,
    orders: taOrders,
  },
} as const

void i18n.use(initReactI18next).init({
  resources,
  // Start in the stored language so the first paint is already correct —
  // hydrating this in an effect caused a visible flash of English.
  lng: readStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  ns: ['common', 'auth', 'farms', 'marketplace', 'orders'],
  // React escapes interpolated values already.
  interpolation: { escapeValue: false },
})

export default i18n
