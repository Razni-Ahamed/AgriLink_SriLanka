import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { CropIcon } from '@/components/ui/CropIcon'
import { formatDate } from '@/lib/utils'
import { useStatusLabel } from '@/lib/useStatusLabel'
import { SeverityBadge } from './SeverityBadge'
import type { AdvisoryResponse } from '@/types/dto/advisories'

const riskVariant = {
  Low: 'info',
  Medium: 'warning',
  High: 'danger',
} as const

const statusVariant = {
  Draft: 'neutral',
  Approved: 'success',
  Rejected: 'danger',
} as const

export function AdvisoryPanel({ advisory }: { advisory: AdvisoryResponse }) {
  const { t } = useTranslation('issues')
  const statusLabel = useStatusLabel()

  return (
    <div className="flex flex-col gap-4">
      {/* Full issue context: what was reported, by whom, on which crop — an officer or admin
          reviewing this needs all of it, not just the AI's recommendation. */}
      <div className="flex flex-col gap-2 rounded-xl bg-bg-canvas p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <CropIcon cropType={advisory.cropType} size={16} />
            <span>{advisory.variety ? `${advisory.cropType} · ${advisory.variety}` : advisory.cropType}</span>
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

      <div>
        <h3 className="mb-1 text-sm font-medium text-text-secondary">
          {t('advisory.recommendation')}
        </h3>
        {/* Model-generated on the server — stays in whatever language the
            pipeline produced, so it is deliberately not translated. */}
        <p className="whitespace-pre-wrap text-text-primary">{advisory.recommendation}</p>
      </div>

      {advisory.reviewedByName && advisory.reviewedAt && (
        <p className="text-xs text-text-secondary">
          {t('advisory.reviewedBy', { name: advisory.reviewedByName, date: formatDate(advisory.reviewedAt) })}
        </p>
      )}
    </div>
  )
}
