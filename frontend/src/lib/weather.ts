import type { DistrictForecast } from '@/types/dto/weather'

export type WeatherKind = 'clear' | 'night' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'storm'

/** WMO weather code (what Open-Meteo returns) → the picture and words we show for it. */
export function weatherKind(code: number | null | undefined, isDay = true): WeatherKind {
  if (code == null) return 'cloudy'
  if (code === 0) return isDay ? 'clear' : 'night'
  if (code <= 2) return isDay ? 'partly' : 'night'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 95) return 'storm'
  // Drizzle (51–57), rain (61–67), snow codes (never in Sri Lanka) and showers (80–86).
  return 'rain'
}

export type WeatherAdvice =
  | { key: 'heavyRain'; mm: number }
  | { key: 'rainSoon'; time: string }
  | { key: 'hot' }
  | { key: 'calm' }

/** Rain chance at or above which an hour counts as "rain likely". */
export const RAIN_LIKELY_PERCENT = 60
/** Rain in a day at or above which fields may flood or wash. */
export const HEAVY_RAIN_MM = 25
/** A day's high at or above which plants need water outside the heat of the day. */
export const HOT_DAY_C = 33

/**
 * One line of farm advice from the forecast, most urgent first: heavy rain today, then rain in the
 * coming hours (hold spraying, it would wash off), then heat (water morning or evening).
 */
export function weatherAdvice(forecast: DistrictForecast): WeatherAdvice {
  const { today, hours, current } = forecast
  if (today.rainMm != null && today.rainMm >= HEAVY_RAIN_MM) {
    return { key: 'heavyRain', mm: Math.round(today.rainMm) }
  }
  const nowRaining =
    weatherKind(current.weatherCode) === 'rain' || weatherKind(current.weatherCode) === 'storm'
  const wetHour = hours.find((hour) => (hour.rainChancePercent ?? 0) >= RAIN_LIKELY_PERCENT)
  if (nowRaining) return { key: 'rainSoon', time: current.time }
  if (wetHour) return { key: 'rainSoon', time: wetHour.time }
  if (today.maxC != null && today.maxC >= HOT_DAY_C) return { key: 'hot' }
  return { key: 'calm' }
}

/** "15:00" in the app's language, from a local Sri Lanka time string. */
export function formatHour(time: string, locale: string): string {
  const [date, clock] = time.split('T')
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = (clock ?? '00:00').split(':').map(Number)
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(year, month - 1, day, hour, minute),
  )
}
