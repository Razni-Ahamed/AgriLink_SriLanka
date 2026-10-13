import { useTranslation } from 'react-i18next'

/** An issue waiting longer than this for an officer is overdue. Same 48 hours as the backend
 *  (Services/ReviewTiming.cs), which also sends it as `overdueAfterHours` with the metrics. */
export const REVIEW_OVERDUE_HOURS = 48

const HOUR_MS = 60 * 60 * 1000

export function hoursSince(isoDate: string, now: number = Date.now()): number {
  return Math.max(0, (now - new Date(isoDate).getTime()) / HOUR_MS)
}

export function isOverdue(createdAt: string, now: number = Date.now()): boolean {
  return hoursSince(createdAt, now) > REVIEW_OVERDUE_HOURS
}

/** Whole days and the hours left over, rounded down. */
export function splitWait(hours: number): { days: number; hours: number } {
  const whole = Math.floor(Math.max(0, hours))
  return { days: Math.floor(whole / 24), hours: whole % 24 }
}

/** Formats a wait as "5 h" under a day and "2 d 4 h" from a day on, in the current language. */
export function useFormatWait(): (hours: number) => string {
  const { t } = useTranslation('common')
  return (hours) => {
    const wait = splitWait(hours)
    return wait.days > 0
      ? t('duration.daysHours', { days: wait.days, hours: wait.hours })
      : t('duration.hours', { hours: wait.hours })
  }
}
