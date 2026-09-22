import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { displayNameOf, type UserProfileResponse } from '@/auth/api'
import { formatDate } from '@/lib/utils'

interface SummaryItemProps {
  label: string
  value: ReactNode
  /** Why this can't be edited here, and where it can be. */
  note?: string
}

function SummaryItem({ label, value, note }: SummaryItemProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="text-sm break-words text-text-primary">{value}</dd>
      {note && <dd className="text-xs text-text-secondary/80">{note}</dd>}
    </div>
  )
}

/** The read-only view of the General tab: everything the account holds, with a note on the
 *  fields that are changed somewhere else. */
export function ProfileSummary({ user }: { user: UserProfileResponse }) {
  const { t } = useTranslation(['auth', 'common'])
  const notSet = <span className="text-text-secondary">{t('auth:profile.general.notSet')}</span>
  const securityNote = t('auth:profile.general.noteSecuritySettings')
  const adminNote = t('auth:profile.general.noteContactAdmin')
  const name = displayNameOf(user)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <UserAvatar photoUrl={user.profilePhotoUrl} role={user.role} name={name} size="xl" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-display text-xl break-words text-text-primary">{name}</p>
          <p className="font-mono text-sm break-all text-text-secondary">@{user.username}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">{t(`common:roles.${user.role}`)}</Badge>
            <span className="text-xs text-text-secondary">
              {t('auth:profile.general.memberSince', { date: formatDate(user.createdAt) })}
            </span>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <SummaryItem label={t('common:fields.fullName')} value={user.fullName} note={securityNote} />
        <SummaryItem
          label={t('auth:profile.general.displayName')}
          value={user.displayName || <span className="text-text-secondary">{t('auth:profile.general.displayNameFallback')}</span>}
        />
        <SummaryItem
          label={t('common:fields.username')}
          value={<span className="font-mono">@{user.username}</span>}
          note={
            user.usernameChangeAvailableAt
              ? t('auth:profile.general.usernameChangeOn', { date: formatDate(user.usernameChangeAvailableAt) })
              : t('auth:profile.general.usernameChangeNow')
          }
        />
        <SummaryItem label={t('common:fields.email')} value={user.email} note={securityNote} />
        <SummaryItem label={t('common:fields.role')} value={t(`common:roles.${user.role}`)} note={adminNote} />
        <SummaryItem label={t('common:fields.district')} value={user.district || notSet} note={adminNote} />
        <SummaryItem label={t('common:fields.phoneNumber')} value={user.phoneNumber || notSet} note={securityNote} />

        {user.role === 'Farmer' && (
          <>
            <SummaryItem label={t('common:fields.fieldPlotNumber')} value={user.fieldPlotNumber || notSet} />
            <SummaryItem label={t('common:fields.nic')} value={user.nic || notSet} note={adminNote} />
          </>
        )}
        {user.role === 'Buyer' && (
          <>
            <SummaryItem label={t('common:fields.businessName')} value={user.businessName || notSet} />
            <SummaryItem
              label={t('common:fields.businessRegistrationNumber')}
              value={user.businessRegistrationNumber || notSet}
              note={adminNote}
            />
            <SummaryItem label={t('common:fields.nic')} value={user.nic || notSet} note={adminNote} />
          </>
        )}
        {user.role === 'Officer' && (
          <SummaryItem label={t('common:fields.department')} value={user.departmentName || notSet} note={adminNote} />
        )}
      </dl>
    </div>
  )
}
