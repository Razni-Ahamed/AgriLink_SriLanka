import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin } from '@phosphor-icons/react'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { StaggerList } from '@/components/ui/motion/StaggerList'
import { useAuthStore } from '@/auth/authStore'
import { usePendingChangeRequests } from '../hooks/useProfileChangeRequests'
import { ProfileChangeRequestCard } from './ProfileChangeRequestCard'

/** Identity-detail change requests (full name / NIC / email) waiting for approval — the same
 *  district scoping the registrations queue and the Security tab's own matrix both already use. */
export function ProfileChangesTab() {
  const { t } = useTranslation('registrations')
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching } = usePendingChangeRequests(page)
  const requests = data?.items
  const role = useAuthStore((state) => state.role)
  const officerDistrict = useAuthStore((state) => state.user?.district)

  return (
    <div className="flex flex-col gap-6">
      {role === 'Officer' && officerDistrict && (
        <p className="flex items-center gap-1 text-sm text-text-secondary">
          <MapPin size={14} />
          {t('pending.changes.scopedToDistrict', { district: officerDistrict })}
        </p>
      )}

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      )}

      {!isLoading && requests && requests.length === 0 && (
        <p className="text-sm text-text-secondary">{t('pending.changes.empty')}</p>
      )}

      {!isLoading && requests && requests.length > 0 && (
        <StaggerList className="flex flex-col gap-3">
          {requests.map((request) => (
            <StaggerList.Item key={request.requestId}>
              <ProfileChangeRequestCard request={request} />
            </StaggerList.Item>
          ))}
        </StaggerList>
      )}

      {data && data.totalPages > 1 && (
        <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} disabled={isFetching} />
      )}
    </div>
  )
}
