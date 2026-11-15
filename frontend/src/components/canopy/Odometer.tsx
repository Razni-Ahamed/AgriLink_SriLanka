import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface OdometerProps {
  value: number
  /** Turns the number into text (thousands separators, decimals). Defaults to en-US grouping. */
  format?: (value: number) => string
  /** Start every digit at 0 and roll up to the value once it is on screen (a first-view entrance). */
  rollIn?: boolean
  className?: string
}

const DIGITS = '0123456789'

/**
 * A number whose digits roll to their new value, like a mechanical counter: prices, totals and
 * counts that change in front of the user. Each digit is a column of 0–9 moved with a transform,
 * so it stays smooth on cheap phones; with motion off (index.css) the digits jump instead.
 * Screen readers get the plain formatted number (the reels are hidden from them).
 */
export function Odometer({
  value,
  format = defaultFormat,
  rollIn = false,
  className,
}: OdometerProps) {
  // Without rollIn, columns start at their digit and only later changes roll.
  const text = format(value)
  const [arrived, setArrived] = useState(!rollIn)
  useEffect(() => {
    if (arrived) return
    const frame = requestAnimationFrame(() => setArrived(true))
    return () => cancelAnimationFrame(frame)
  }, [arrived])

  return (
    <span className={cn('odometer', className)}>
      <span className="sr-only">{text}</span>
      {[...text].map((char, index) =>
        DIGITS.includes(char) ? (
          <span key={`${text.length}-${index}`} className="odometer-cell" aria-hidden="true">
            <span
              className="odometer-reel"
              style={{ transform: `translateY(${arrived ? -Number(char) * 10 : 0}%)` }}
            >
              {[...DIGITS].map((digit) => (
                <span key={digit}>{digit}</span>
              ))}
            </span>
          </span>
        ) : (
          <span key={`${text.length}-${index}`} aria-hidden="true">
            {char}
          </span>
        ),
      )}
    </span>
  )
}

function defaultFormat(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
