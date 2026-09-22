import { keepPreviousData, useQuery } from '@tanstack/react-query'
import * as adminApi from '../api/adminApi'

export function useAuditLogs(page: number, entityName?: string) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', entityName ?? 'all', page] as const,
    queryFn: () => adminApi.getAuditLogs(page, entityName),
    placeholderData: keepPreviousData,
  })
}
