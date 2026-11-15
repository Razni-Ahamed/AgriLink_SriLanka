import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StageList } from '@/components/canopy/StageList'

interface ReportProgressProps {
  /** The farmer's own photo of the problem, or the crop's photo when they didn't attach one. */
  photoUrl: string
  hasPhoto: boolean
  /** True once the server has answered: every step ticks. */
  done: boolean
}

// When each step starts, in seconds after sending. The server works in one request that takes
// about half a minute and doesn't report its progress, so these are paced to that; the last step
// stays in progress until the answer actually arrives.
const STARTS = [0, 1.5, 6, 14]

/**
 * What a farmer sees while their report is being worked on: their photo with a scan line sweeping
 * over it, and the steps ticking off one by one, so a half-minute wait reads as work happening
 * rather than a frozen button. The note says the steps are a guide, because they are.
 */
export function ReportProgress({ photoUrl, hasPhoto, done }: ReportProgressProps) {
  const { t } = useTranslation('issues')
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const started = Date.now()
    const timer = setInterval(() => setElapsed((Date.now() - started) / 1000), 250)
    return () => clearInterval(timer)
  }, [])

  const steps = [
    t('new.progress.send'),
    ...(hasPhoto ? [t('new.progress.photo')] : []),
    t('new.progress.compare'),
    t('new.progress.advice'),
  ]
  const starts = hasPhoto ? STARTS : [STARTS[0], STARTS[2], STARTS[3]]
  const running = starts.filter((start) => elapsed >= start).length - 1
  const current = done ? steps.length : Math.min(running, steps.length - 1)

  return (
    <div className="flex flex-col gap-5" role="status">
      <h2 className="font-display text-2xl font-bold text-text-primary">
        {done ? t('new.progress.done') : t('new.progress.title')}
      </h2>
      <div className="relative h-64 overflow-hidden rounded-[24px] bg-brand-ink">
        <img src={photoUrl} alt="" aria-hidden="true" className="size-full object-cover" />
        {!done && <div className="scan-line" aria-hidden="true" />}
        {/* Viewfinder corners. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-4 size-[calc(100%-2rem)] text-white"
        >
          <path
            d="M0 14V0h14M86 0h14v14M100 86v14H86M14 100H0V86"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <StageList stages={steps} current={current} />
      <p className="text-xs text-text-secondary">{t('new.progress.note')}</p>
    </div>
  )
}
