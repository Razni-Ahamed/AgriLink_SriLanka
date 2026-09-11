import { useTranslation } from 'react-i18next'
import type { AuditLogEntry } from '@/types/dto/admin'

interface AuditLogTableProps {
  entries: AuditLogEntry[]
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  const { t, i18n } = useTranslation('orders')

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value),
    )

  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-forest/10">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-brand-forest/10 bg-bg-canvas text-text-secondary">
            <th className="px-4 py-3 font-medium">{t('auditLog.columns.when')}</th>
            <th className="px-4 py-3 font-medium">{t('auditLog.columns.actor')}</th>
            <th className="px-4 py-3 font-medium">{t('auditLog.columns.action')}</th>
            <th className="px-4 py-3 font-medium">{t('auditLog.columns.entity')}</th>
            <th className="px-4 py-3 font-medium">{t('auditLog.columns.change')}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.auditId} className="border-b border-brand-forest/5 last:border-0 align-top">
              <td className="whitespace-nowrap px-4 py-3 text-text-secondary">{formatDate(entry.createdAt)}</td>
              <td className="px-4 py-3 text-text-primary">{entry.userName}</td>
              <td className="px-4 py-3 text-text-primary">{entry.action}</td>
              <td className="px-4 py-3 text-text-secondary">
                {entry.entityName} #{entry.entityId}
              </td>
              <td className="px-4 py-3 text-text-secondary">
                {entry.oldValue || entry.newValue ? (
                  <span>
                    {entry.oldValue ?? '—'} → {entry.newValue ?? '—'}
                  </span>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
