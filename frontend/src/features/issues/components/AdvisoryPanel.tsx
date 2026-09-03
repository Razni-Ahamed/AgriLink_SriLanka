import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { useStatusLabel } from '@/lib/useStatusLabel'
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
    </div>
  )
}
