import type { WeatherKind } from '@/lib/weather'
import { cn } from '@/lib/utils'

/**
 * An animated weather picture: the sun's rays turn slowly, clouds drift, rain falls, lightning
 * flickers. The loops are slow and small (index.css, `weather-*`); Lite and Off motion hold them
 * still.
 */
export function WeatherIcon({ kind, className }: { kind: WeatherKind; className?: string }) {
  const sun = kind === 'clear' || kind === 'partly'
  const cloud = kind !== 'clear' && kind !== 'night'
  const rain = kind === 'rain' || kind === 'storm'

  return (
    <svg viewBox="0 0 88 80" aria-hidden="true" className={cn('overflow-visible', className)}>
      {sun && (
        <g className="weather-sun">
          <g stroke="#efc062" strokeWidth={2.4} strokeLinecap="round" className="weather-rays">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line
                key={angle}
                x1="34"
                y1="7"
                x2="34"
                y2="12"
                transform={`rotate(${angle} 34 30)`}
              />
            ))}
          </g>
          <circle cx="34" cy="30" r="13" fill="#efc062" />
        </g>
      )}
      {kind === 'night' && (
        <path d="M44 14a17 17 0 1 0 14 26A14 14 0 0 1 44 14Z" fill="#e8efe6" opacity="0.92" />
      )}
      {kind === 'fog' && (
        <g
          stroke="#e8efe6"
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.85}
          className="weather-cloud"
        >
          <line x1="16" y1="58" x2="70" y2="58" />
          <line x1="24" y1="66" x2="78" y2="66" />
        </g>
      )}
      {cloud && (
        <g className="weather-cloud">
          <path
            d={
              kind === 'partly'
                ? 'M30 60h38a12 12 0 0 0 0-24 16 16 0 0 0-30-3 11 11 0 0 0-8 27Z'
                : 'M22 56h44a14 14 0 0 0 0-28 18 18 0 0 0-34-4 13 13 0 0 0-10 32Z'
            }
            fill={kind === 'storm' ? '#b8c4bc' : '#e8efe6'}
            opacity={0.96}
          />
        </g>
      )}
      {rain && (
        <g stroke="#9fd0e6" strokeWidth={2.2} strokeLinecap="round" className="weather-rain">
          <line x1="36" y1="64" x2="33" y2="78" />
          <line x1="48" y1="64" x2="45" y2="78" />
          <line x1="60" y1="64" x2="57" y2="78" />
        </g>
      )}
      {kind === 'storm' && (
        <path d="M50 58l-7 12h6l-4 10 11-14h-6l4-8Z" fill="#efc062" className="weather-bolt" />
      )}
    </svg>
  )
}
