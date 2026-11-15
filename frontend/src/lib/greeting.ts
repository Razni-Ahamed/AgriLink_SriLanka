export type TimeOfDay = 'morning' | 'afternoon' | 'evening'

/** Before noon is morning, until 5 pm afternoon, after that evening. */
export function timeOfDay(now: Date = new Date()): TimeOfDay {
  const hour = now.getHours()
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
}

/** The locale to format dates in for each app language. */
export function dateLocale(language: string): string {
  return language === 'si' ? 'si-LK' : language === 'ta' ? 'ta-LK' : 'en-GB'
}

/** "Sunday 15 November", in the app's language. */
export function longDate(language: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat(dateLocale(language), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now)
}
