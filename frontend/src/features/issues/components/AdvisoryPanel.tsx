import { ClockCountdown } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { CropIcon } from '@/components/ui/CropIcon'
import { formatDate } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { IssuePhotoGallery } from './IssuePhotoGallery'
import { SeverityBadge } from './SeverityBadge'
import type { AdvisoryResponse, AdvisoryStatus } from '@/types/dto/advisories'

const riskVariant = {
  Low: 'info',
  Medium: 'warning',
  High: 'danger',
} as const

const statusVariant: Record<AdvisoryStatus, 'neutral' | 'info' | 'success' | 'danger'> = {
  Draft: 'neutral',
  Preliminary: 'info',
  Approved: 'success',
  Rejected: 'danger',
}

interface AdvisoryPanelProps {
  advisory: AdvisoryResponse
  /** A farmer sees the advice they should act on; a reviewer sees everything that produced it. */
  audience?: 'farmer' | 'reviewer'
}

export function AdvisoryPanel({ advisory, audience = 'reviewer' }: AdvisoryPanelProps) {
  const { t } = useTranslation('issues')
  const statusLabel = useStatusLabel()

  // An officer who rejected the AI's advice and wrote their own has replaced it: showing the
  // farmer both would leave them to guess which one to follow.
  const hideAiRecommendation =
    audience === 'farmer' && advisory.status === 'Rejected' && Boolean(advisory.officerTreatment)

  const diagnosis = advisory.confirmedDiseaseName
    ? t('advisory.confirmedDiagnosis', { disease: advisory.confirmedDiseaseName })
    : advisory.photoDiagnosis
      ? t('advisory.photoDiagnosis', { disease: advisory.photoDiagnosis.diseaseName })
      : null

  return (
    <div className="flex flex-col gap-4">
      {audience === 'farmer' && advisory.status === 'Preliminary' && (
        <div
          role="note"
          className="flex gap-3 rounded-xl border border-state-info/30 bg-state-info/10 p-3 text-sm"
        >
          <ClockCountdown size={20} weight="duotone" className="shrink-0 text-state-info" />
          <div className="flex flex-col gap-1">
            <p className="font-medium text-text-primary">{t('advisory.preliminaryTitle')}</p>
            <p className="text-text-secondary">{t('advisory.preliminaryBody')}</p>
          </div>
        </div>
      )}

      {/* Full issue context: what was reported, by whom, on which crop — an officer or admin
          reviewing this needs all of it, not just the AI's recommendation. */}
      <div className="flex flex-col gap-2 rounded-xl bg-bg-canvas p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <CropIcon cropType={advisory.cropType} size={16} />
            <span>
              {advisory.variety ? `${advisory.cropType} · ${advisory.variety}` : advisory.cropType}
            </span>
          </div>
          <SeverityBadge severity={advisory.issueSeverity} />
        </div>
        <p className="whitespace-pre-wrap text-sm text-text-primary">{advisory.issueDescription}</p>
        <p className="text-xs text-text-secondary">
          {t('advisory.reportedBy', {
            name: advisory.reporterName || t('advisory.unknownReporter'),
            district: advisory.district,
            date: formatDate(advisory.issueCreatedAt),
          })}
        </p>
      </div>

      <IssuePhotoGallery photos={advisory.photos ?? []} />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant[advisory.status]}>
          {statusLabel('advisory', advisory.status)}
        </Badge>
        <Badge variant={riskVariant[advisory.riskLevel]}>
          {t('advisory.riskPrefix', { level: statusLabel('risk', advisory.riskLevel) })}
        </Badge>
        <span className="font-mono text-sm text-text-secondary">
          {t('advisory.confidence', { value: Math.round(advisory.confidenceScore * 100) })}
        </span>
      </div>

      {/* Disease names come from the server's knowledge base, in English. */}
      {diagnosis && <p className="text-sm font-medium text-text-primary">{diagnosis}</p>}

      {advisory.officerTreatment && (
        <div className="flex flex-col gap-1 rounded-xl border border-brand-forest/20 bg-brand-forest/5 p-3">
          <h3 className="text-sm font-medium text-brand-forest">{t('advisory.officerAdvice')}</h3>
          <p className="whitespace-pre-wrap text-text-primary">{advisory.officerTreatment}</p>
        </div>
      )}

      {!hideAiRecommendation && (
        <div>
          <h3 className="mb-1 text-sm font-medium text-text-secondary">
            {t('advisory.recommendation')}
          </h3>
          {/* Model-generated on the server — stays in whatever language the
              pipeline produced, so it is deliberately not translated. */}
          <p className="whitespace-pre-wrap text-text-primary">{advisory.recommendation}</p>
        </div>
      )}

      {advisory.reviewedByName && advisory.reviewedAt && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-text-secondary">
            {t('advisory.reviewedBy', {
              name: advisory.reviewedByName,
              date: formatDate(advisory.reviewedAt),
            })}
          </p>
          {advisory.reviewNote && (
            <p className="whitespace-pre-wrap rounded-xl bg-bg-canvas p-3 text-sm text-text-primary">
              {advisory.reviewNote}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
