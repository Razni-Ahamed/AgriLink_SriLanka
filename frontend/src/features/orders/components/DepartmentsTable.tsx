import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import type { Department } from '@/types/dto/admin'

interface DepartmentsTableProps {
  departments: Department[]
  isMutating?: boolean
  onRename: (department: Department) => void
  onDelete: (department: Department) => void
}

export function DepartmentsTable({ departments, isMutating, onRename, onDelete }: DepartmentsTableProps) {
  const { t, i18n } = useTranslation(['orders', 'common'])

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(value))

  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-forest/10">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-brand-forest/10 bg-bg-canvas text-text-secondary">
            <th className="px-4 py-3 font-medium">{t('orders:departments.name')}</th>
            <th className="px-4 py-3 font-medium">{t('orders:departments.createdOn')}</th>
            <th className="px-4 py-3 font-medium">{t('orders:admin.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((department) => (
            <tr key={department.departmentId} className="border-b border-brand-forest/5 last:border-0">
              <td className="px-4 py-3 text-text-primary">{department.name}</td>
              <td className="px-4 py-3 text-text-secondary">{formatDate(department.createdAt)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isMutating}
                    onClick={() => onRename(department)}
                  >
                    {t('orders:departments.rename')}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={isMutating}
                    onClick={() => onDelete(department)}
                  >
                    {t('common:actions.delete')}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
