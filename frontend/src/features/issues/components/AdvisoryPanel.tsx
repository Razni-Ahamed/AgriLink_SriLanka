import { Badge } from '@/components/ui/Badge'
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
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant[advisory.status]}>{advisory.status}</Badge>
        <Badge variant={riskVariant[advisory.riskLevel]}>Risk: {advisory.riskLevel}</Badge>
        <span className="font-mono text-sm text-text-secondary">
          {Math.round(advisory.confidenceScore * 100)}% confidence
        </span>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-medium text-text-secondary">Recommendation</h3>
        <p className="whitespace-pre-wrap text-text-primary">{advisory.recommendation}</p>
      </div>
    </div>
  )
}
