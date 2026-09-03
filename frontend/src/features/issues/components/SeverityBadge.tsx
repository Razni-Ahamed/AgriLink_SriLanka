import { Badge } from '@/components/ui/Badge'
import { useStatusLabel } from '@/lib/useStatusLabel'
import type { IssueSeverity } from '@/types/dto/issues'

const severityVariant = {
  Low: 'info',
  Medium: 'warning',
  High: 'danger',
} as const

export function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  const statusLabel = useStatusLabel()

  return <Badge variant={severityVariant[severity]}>{statusLabel('severity', severity)}</Badge>
}
