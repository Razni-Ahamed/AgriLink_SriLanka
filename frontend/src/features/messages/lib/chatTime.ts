import { currentIntlLocale } from '@/i18n/config'

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Calendar days between two moments in local time: 0 today, 1 yesterday. */
export function daysAgo(value: string | Date, now: Date = new Date()): number {
  const date = typeof value === 'string' ? new Date(value) : value
  return Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
}

export function formatClockTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleTimeString(currentIntlLocale(), { hour: 'numeric', minute: '2-digit' })
}

/** For the chat list: the time today, the weekday this week, otherwise the date. */
export function formatListTime(value: string | Date, now: Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const days = daysAgo(date, now)
  if (days <= 0) {
    return formatClockTime(date)
  }
  if (days < 7) {
    return date.toLocaleDateString(currentIntlLocale(), { weekday: 'short' })
  }
  return date.toLocaleDateString(currentIntlLocale(), { day: 'numeric', month: 'short' })
}

/** True when two messages fall on different local days, so a date divider goes between them. */
export function isNewDay(previous: string | undefined, current: string): boolean {
  return previous === undefined || startOfDay(new Date(previous)) !== startOfDay(new Date(current))
}
