import { useQuery } from '@tanstack/react-query'
import * as adminApi from '../api/adminApi'

export function useAuditLogs(entityName?: string) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', entityName ?? 'all'] as const,
    queryFn: () => adminApi.getAuditLogs(entityName),
  })
}
