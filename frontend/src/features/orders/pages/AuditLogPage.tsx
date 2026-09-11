import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/Skeleton'
import { AuditLogTable } from '../components/AuditLogTable'
import { useAuditLogs } from '../hooks/useAuditLogs'

export function AuditLogPage() {
  const { t } = useTranslation('orders')
  const { data: entries, isLoading, isError } = useAuditLogs()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-text-primary">{t('auditLog.title')}</h1>
        <p className="text-sm text-text-secondary">{t('auditLog.subtitle')}</p>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      )}

      {isError && <p className="text-sm text-state-danger">{t('auditLog.loadError')}</p>}

      {!isLoading && !isError && entries && entries.length === 0 && (
        <p className="text-sm text-text-secondary">{t('auditLog.empty')}</p>
      )}

      {!isLoading && !isError && entries && entries.length > 0 && <AuditLogTable entries={entries} />}
    </div>
  )
}
