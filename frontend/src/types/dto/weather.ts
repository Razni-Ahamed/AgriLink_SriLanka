/** GET /api/weather/{district}. Times are local Sri Lanka time ("2026-11-15T15:00"); codes are WMO. */
export interface DistrictForecast {
  district: string
  current: { time: string; temperatureC: number; weatherCode: number; isDay: boolean }
  today: {
    maxC: number | null
    minC: number | null
    rainMm: number | null
    rainChancePercent: number | null
  }
  hours: Array<{
    time: string
    temperatureC: number | null
    rainChancePercent: number | null
    weatherCode: number | null
  }>
}
