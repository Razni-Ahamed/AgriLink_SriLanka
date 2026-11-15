import { describe, expect, it } from 'vitest'
import type { DistrictForecast } from '@/types/dto/weather'
import { formatHour, weatherAdvice, weatherKind } from './weather'

function forecast(overrides: Partial<DistrictForecast> = {}): DistrictForecast {
  return {
    district: 'Kandy',
    current: { time: '2026-11-15T10:15', temperatureC: 28, weatherCode: 1, isDay: true },
    today: { maxC: 30, minC: 21, rainMm: 2, rainChancePercent: 20 },
    hours: [
      { time: '2026-11-15T11:00', temperatureC: 29, rainChancePercent: 10, weatherCode: 1 },
      { time: '2026-11-15T14:00', temperatureC: 30, rainChancePercent: 20, weatherCode: 2 },
    ],
    ...overrides,
  }
}

describe('weatherKind', () => {
  it('maps WMO codes to the pictures we draw', () => {
    expect(weatherKind(0)).toBe('clear')
    expect(weatherKind(0, false)).toBe('night')
    expect(weatherKind(2)).toBe('partly')
    expect(weatherKind(3)).toBe('cloudy')
    expect(weatherKind(45)).toBe('fog')
    expect(weatherKind(61)).toBe('rain')
    expect(weatherKind(81)).toBe('rain')
    expect(weatherKind(95)).toBe('storm')
    expect(weatherKind(null)).toBe('cloudy')
  })
})

describe('weatherAdvice', () => {
  it('says all is calm when no rain or heat is coming', () => {
    expect(weatherAdvice(forecast())).toEqual({ key: 'calm' })
  })

  it('warns to hold spraying at the first hour rain is likely', () => {
    const advice = weatherAdvice(
      forecast({
        hours: [
          { time: '2026-11-15T11:00', temperatureC: 29, rainChancePercent: 30, weatherCode: 2 },
          { time: '2026-11-15T14:00', temperatureC: 27, rainChancePercent: 75, weatherCode: 61 },
        ],
      }),
    )
    expect(advice).toEqual({ key: 'rainSoon', time: '2026-11-15T14:00' })
  })

  it('puts heavy rain before anything else', () => {
    const advice = weatherAdvice(
      forecast({ today: { maxC: 35, minC: 24, rainMm: 41.6, rainChancePercent: 90 } }),
    )
    expect(advice).toEqual({ key: 'heavyRain', mm: 42 })
  })

  it('suggests watering outside the heat on a hot dry day', () => {
    expect(
      weatherAdvice(forecast({ today: { maxC: 34, minC: 25, rainMm: 0, rainChancePercent: 5 } })),
    ).toEqual({ key: 'hot' })
  })
})

describe('formatHour', () => {
  it('shows the Sri Lankan hour as given, whatever the browser time zone', () => {
    expect(formatHour('2026-11-15T15:00', 'en-GB')).toBe('15:00')
  })
})
