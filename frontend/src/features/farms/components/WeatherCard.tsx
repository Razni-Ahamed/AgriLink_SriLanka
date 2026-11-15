import { useDistrictLabel } from '@/lib/useDistrictLabel'
import { CloudSlash, Drop, Warning } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { BannerGlass } from '@/components/canopy/PhotoBanner'
import { WeatherIcon } from '@/components/canopy/WeatherIcon'
import { dateLocale } from '@/lib/greeting'
import { formatHour, weatherAdvice, weatherKind } from '@/lib/weather'
import { useDistrictForecast } from '../hooks/useDistrictForecast'

/**
 * The weather for the farmer's district, on glass over their home page's photo: an animated
 * picture of the sky now, the temperature, the next few hours and one line of farm advice (hold
 * spraying before rain, water outside the heat). Says so plainly when the forecast can't load.
 */
export function WeatherCard({ district }: { district: string }) {
  const { t, i18n } = useTranslation('farms')
  const districtLabel = useDistrictLabel()
  const locale = dateLocale(i18n.language)
  const { data: forecast, isLoading, isError } = useDistrictForecast(district)

  if (isLoading) {
    return <BannerGlass className="h-full min-h-[200px] animate-pulse" />
  }

  if (isError || !forecast) {
    return (
      <BannerGlass className="flex h-full items-center gap-3 p-5 text-sm text-white/80">
        <CloudSlash size={22} aria-hidden="true" />
        {t('weather.unavailable')}
      </BannerGlass>
    )
  }

  const kind = weatherKind(forecast.current.weatherCode, forecast.current.isDay)
  const advice = weatherAdvice(forecast)
  const adviceText =
    advice.key === 'rainSoon'
      ? t('weather.advice.rainSoon', { time: formatHour(advice.time, locale) })
      : advice.key === 'heavyRain'
        ? t('weather.advice.heavyRain', { mm: advice.mm })
        : t(`weather.advice.${advice.key}`)
  const warn = advice.key !== 'calm'

  return (
    <BannerGlass className="flex h-full flex-col p-4 sm:p-5">
      <section aria-label={t('weather.label', { district: districtLabel(forecast.district) })}>
        <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-3">
          <WeatherIcon kind={kind} className="h-[4.5rem] w-20" />
          <div className="text-right">
            <p className="font-display text-5xl leading-none font-bold">
              {Math.round(forecast.current.temperatureC)}°
            </p>
            <p className="mt-1 text-sm text-white/75">
              {t(`weather.kind.${kind}`)} · {districtLabel(forecast.district)}
            </p>
            {forecast.today.maxC != null && forecast.today.minC != null && (
              <p className="text-xs text-white/60">
                {t('weather.range', {
                  max: Math.round(forecast.today.maxC),
                  min: Math.round(forecast.today.minC),
                })}
              </p>
            )}
          </div>
        </div>

        {forecast.hours.length > 0 && (
          <ul className="my-3 grid grid-cols-4 gap-1 border-y border-white/10 py-2.5 text-center text-xs text-white/70">
            {forecast.hours.map((hour) => (
              <li key={hour.time} className="flex flex-col items-center gap-0.5">
                <span>{formatHour(hour.time, locale)}</span>
                <WeatherIcon kind={weatherKind(hour.weatherCode)} className="h-6 w-7" />
                <b className="text-sm font-semibold text-white">
                  {hour.temperatureC != null ? `${Math.round(hour.temperatureC)}°` : '–'}
                </b>
                {hour.rainChancePercent != null && hour.rainChancePercent > 0 && (
                  <span className="flex items-center gap-0.5 text-[11px] text-[#9fd0e6]">
                    <Drop size={10} weight="fill" aria-hidden="true" />
                    {hour.rainChancePercent}%
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="flex items-start gap-2 text-sm">
          {warn && (
            <Warning
              size={17}
              weight="bold"
              className="mt-0.5 shrink-0 text-[#efc062]"
              aria-hidden="true"
            />
          )}
          <span>{adviceText}</span>
        </p>
      </section>
    </BannerGlass>
  )
}
