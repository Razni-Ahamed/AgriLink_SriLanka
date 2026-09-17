import { Camera, Info } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { IconBadge } from '@/components/ui/IconBadge'
import type { AdvisoryResponse } from '@/types/dto/advisories'

const KNOWN_REASONS = [
  'UnknownDisease',
  'SeriousDisease',
  'NoApprovedTreatment',
  'ModelNeverAutoReleases',
  'LowConfidence',
  'DescriptionMismatch',
  'AutoReleaseDisabled',
  'TriageFailed',
] as const

type KnownReason = (typeof KNOWN_REASONS)[number]

function isKnownReason(code: string): code is KnownReason {
  return (KNOWN_REASONS as readonly string[]).includes(code)
}

/**
 * What the photo model said and why it is waiting for this officer. Reviewer-only: the confidence,
 * model version and escalation reasons are absent from a farmer's copy of the advisory.
 */
export function PhotoDiagnosisReviewPanel({ advisory }: { advisory: AdvisoryResponse }) {
  const { t } = useTranslation('issues')
  const diagnosis = advisory.photoDiagnosis

  if (!diagnosis) {
    return null
  }

  const reasons = diagnosis.escalationReasons ?? []

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand-forest/15 bg-bg-canvas p-3">
      <div className="flex items-center gap-2">
        <IconBadge tone="forest">
          <Camera size={16} weight="duotone" />
        </IconBadge>
        <h3 className="text-sm font-medium text-text-primary">{t('photoReview.title')}</h3>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-medium text-text-primary">
          {t('photoReview.disease', { disease: diagnosis.diseaseName })}
        </p>
        {diagnosis.modelConfidence != null && (
          <span className="font-mono text-sm text-text-secondary">
            {t('photoReview.modelConfidence', {
              value: Math.round(diagnosis.modelConfidence * 100),
            })}
          </span>
        )}
        {diagnosis.modelVersion && (
          <span className="font-mono text-xs text-text-secondary">
            {t('photoReview.modelVersion', { version: diagnosis.modelVersion })}
          </span>
        )}
      </div>

      {advisory.status === 'Preliminary' && (
        <p className="flex gap-2 rounded-lg bg-state-info/10 p-2 text-sm text-text-primary">
          <Info size={16} weight="duotone" className="mt-0.5 shrink-0 text-state-info" />
          {t('photoReview.adviceAlreadySent')}
        </p>
      )}

      {reasons.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-text-secondary">{t('photoReview.reasonsTitle')}</p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-text-primary">
            {reasons.map((code) => (
              <li key={code}>{isKnownReason(code) ? t(`photoReview.reasons.${code}`) : code}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
