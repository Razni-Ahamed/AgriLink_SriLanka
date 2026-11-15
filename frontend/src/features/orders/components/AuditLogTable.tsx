import { useTranslation } from 'react-i18next'
import { describeChange, sentenceCase } from '../lib/auditFormat'
import type { AuditLogEntry } from '@/types/dto/admin'

interface AuditLogTableProps {
  entries: AuditLogEntry[]
}

const cell = 'max-md:block md:px-4 md:py-3'

/**
 * The audit log as something a person can read: "Registration approved" rather than
 * `RegistrationApproved`, "Phone number: 071… → 077…" rather than two blobs of JSON, a file name
 * rather than a photo's full address.
 *
 * The action, record and field names are the code's own, turned into words. They are not in the
 * translation files, so they stay in English in every language; translating them needs a key for
 * each of the actions the API writes.
 *
 * From a tablet up it is a table. On a phone five columns cannot fit, so each entry becomes a
 * block, with the column headings kept for screen readers.
 */
export function AuditLogTable({ entries }: AuditLogTableProps) {
  const { t, i18n } = useTranslation(['orders', 'common'])
  const labels = { yes: t('common:answers.yes'), no: t('common:answers.no') }

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value),
    )

  return (
    <div className="rounded-2xl border border-line bg-bg-surface md:overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm max-md:block md:min-w-[720px]">
        <thead className="max-md:sr-only">
          <tr className="border-b border-line bg-bg-canvas text-text-secondary">
            <th className="px-4 py-3 font-medium">{t('orders:auditLog.columns.when')}</th>
            <th className="px-4 py-3 font-medium">{t('orders:auditLog.columns.actor')}</th>
            <th className="px-4 py-3 font-medium">{t('orders:auditLog.columns.action')}</th>
            <th className="px-4 py-3 font-medium">{t('orders:auditLog.columns.entity')}</th>
            <th className="px-4 py-3 font-medium">{t('orders:auditLog.columns.change')}</th>
          </tr>
        </thead>
        <tbody className="max-md:block">
          {entries.map((entry) => {
            const changes = describeChange(entry.oldValue, entry.newValue, labels)
            return (
              <tr
                key={entry.auditId}
                className="border-b border-line align-top last:border-0 max-md:flex max-md:flex-col max-md:gap-0.5 max-md:px-4 max-md:py-3"
              >
                <td
                  className={`${cell} text-text-secondary tabular-nums max-md:order-3 max-md:text-xs md:whitespace-nowrap`}
                >
                  {formatDate(entry.createdAt)}
                </td>
                <td className={`${cell} text-text-primary max-md:order-2 max-md:text-xs`}>
                  {entry.userName}
                </td>
                <td className={`${cell} font-medium text-text-primary max-md:order-1`}>
                  {sentenceCase(entry.action)}
                </td>
                <td className={`${cell} text-text-secondary max-md:order-4 max-md:text-xs`}>
                  {sentenceCase(entry.entityName)} #{entry.entityId}
                </td>
                <td className={`${cell} text-text-secondary max-md:order-5`}>
                  {changes.length === 0 ? (
                    <span className="max-md:hidden">—</span>
                  ) : (
                    <ul className="flex flex-col gap-0.5">
                      {changes.map((change, index) => (
                        <li key={index} className="break-words">
                          {change.field && <span>{change.field}: </span>}
                          <span className="text-text-primary">
                            {change.from ?? '—'} → {change.to ?? '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
