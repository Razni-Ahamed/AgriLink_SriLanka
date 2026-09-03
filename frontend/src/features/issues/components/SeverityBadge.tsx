import { Badge } from '@/components/ui/Badge'
import type { IssueSeverity } from '@/types/dto/issues'

const severityVariant = {
  Low: 'info',
  Medium: 'warning',
  High: 'danger',
} as const

export function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  return <Badge variant={severityVariant[severity]}>{severity}</Badge>
}
