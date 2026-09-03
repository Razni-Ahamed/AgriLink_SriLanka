import { currentIntlLocale } from '@/i18n/config'

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Localized number only — the unit belongs in a translation string
 * (`common:units.*`), since word order around it differs by language.
 */
export function formatQuantity(quantity: number): string {
  return quantity.toLocaleString(currentIntlLocale(), { maximumFractionDigits: 2 })
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleDateString(currentIntlLocale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
